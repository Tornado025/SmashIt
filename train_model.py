import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow.keras import layers, models
import seaborn as sns

# ── CONFIG ──────────────────────────────────────────────────────────────────
SAMPLE_RATE = 100  # Hz
STROKE_DURATION = 1.2  # seconds
N_SAMPLES = int(SAMPLE_RATE * STROKE_DURATION)  # 120 samples per stroke
N_PER_CLASS = 2500  # strokes per class → 10000 total (4 classes)
NOISE_FLOOR = 0.18  # g  (cheap IMU noise)
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)
tf.random.set_seed(RANDOM_SEED)

STROKE_PARAMS = {
    'Overhead Smash': {'base_freq': 8.4, 'amp': 1.15, 'impact_pos': 0.72},
    'Backhand Clear': {'base_freq': 6.0, 'amp': 0.88, 'impact_pos': 0.65},
    'Net Drop Shot': {'base_freq': 4.0, 'amp': 0.52, 'impact_pos': 0.60},
    'Forehand Drive': {'base_freq': 7.1, 'amp': 0.95, 'impact_pos': 0.68}
}

STROKE_VARIATION = {
    'Overhead Smash': {'freq_jitter': 0.9, 'amp_jitter': 0.16, 'impact_jitter': 0.04, 'phase_jitter': 0.22},
    'Backhand Clear': {'freq_jitter': 0.8, 'amp_jitter': 0.14, 'impact_jitter': 0.05, 'phase_jitter': 0.20},
    'Net Drop Shot': {'freq_jitter': 0.7, 'amp_jitter': 0.12, 'impact_jitter': 0.05, 'phase_jitter': 0.18},
    'Forehand Drive': {'freq_jitter': 0.85, 'amp_jitter': 0.15, 'impact_jitter': 0.04, 'phase_jitter': 0.20}
}

def smooth_noise(scale, size):
    white = np.random.randn(size) * scale
    kernel = np.array([0.2, 0.6, 0.2], dtype=np.float32)
    return np.convolve(white, kernel, mode='same')


# ── VIRTUAL IMU SIGNAL GENERATOR ────────────────────────────────────────────
def generate_stroke(stroke_name, skill=0.75):
    p = STROKE_PARAMS[stroke_name]
    v = STROKE_VARIATION[stroke_name]

    freq = p['base_freq'] + np.random.uniform(-v['freq_jitter'], v['freq_jitter'])
    amp = p['amp'] * np.random.uniform(1 - v['amp_jitter'], 1 + v['amp_jitter'])
    impact_pos = np.clip(p['impact_pos'] + np.random.uniform(-v['impact_jitter'], v['impact_jitter']), 0.48, 0.84)
    phase = np.random.uniform(-v['phase_jitter'], v['phase_jitter'])
    tempo = np.random.uniform(0.92, 1.08)
    axis_mix = np.random.uniform(-0.18, 0.18, size=(6, 6))
    axis_mix[np.diag_indices(6)] = 1.0

    t = np.linspace(0, 1, N_SAMPLES)
    warped_t = np.clip(t * tempo, 0, 1)
    env = np.sin(warped_t * np.pi)
    impact_idx = int(impact_pos * N_SAMPLES)
    impact_width = np.random.uniform(7, 11)
    impact = np.exp(-((np.arange(N_SAMPLES) - impact_idx) / impact_width) ** 2)
    drift = np.linspace(-1, 1, N_SAMPLES)
    micro_burst = np.exp(-((np.arange(N_SAMPLES) - (impact_idx + np.random.randint(-5, 6))) / 3.5) ** 2)
    skill_factor = np.clip(skill, 0.35, 1.0)

    # Gyroscope axes (°/s)
    gx = (
        amp * np.sin(warped_t * np.pi * freq + phase) * 85 * skill_factor
        + impact * (72 + np.random.uniform(-8, 10)) * skill_factor
        + drift * np.random.uniform(-8, 8)
        + smooth_noise(NOISE_FLOOR * 22, N_SAMPLES)
    )

    gy = (
        amp * np.cos(warped_t * np.pi * freq * 1.3 + phase * 0.8) * 52 * skill_factor
        + impact * (48 + np.random.uniform(-7, 8)) * skill_factor
        + drift * np.random.uniform(-6, 6)
        + smooth_noise(NOISE_FLOOR * 18, N_SAMPLES)
    )

    gz = (
        amp * np.sin(warped_t * np.pi * freq * 2.1 - phase * 0.5) * 38 * skill_factor
        + env * 30 * skill_factor
        + micro_burst * np.random.uniform(10, 18)
        + smooth_noise(NOISE_FLOOR * 16, N_SAMPLES)
    )

    # Accelerometer axes (g)
    ax = (
        np.sin(warped_t * np.pi * 3.4 + phase * 0.25) * 5.2 * skill_factor
        + impact * 13.5 * skill_factor
        + drift * np.random.uniform(-1.2, 1.2)
        + smooth_noise(NOISE_FLOOR * 4, N_SAMPLES)
    )

    ay = (
        np.cos(warped_t * np.pi * 2.7 - phase * 0.15) * 4.1 * skill_factor
        + impact * 9.8 * skill_factor
        + drift * np.random.uniform(-1.0, 1.0)
        + smooth_noise(NOISE_FLOOR * 3.5, N_SAMPLES)
    )

    az = (
        np.sin(warped_t * np.pi * 1.8 + phase * 0.35) * 3.5 * skill_factor
        + impact * 7.2 * skill_factor
        + smooth_noise(NOISE_FLOOR * 3, N_SAMPLES)
    )

    signal = np.stack([gx, gy, gz, ax, ay, az], axis=1)
    mixed = signal @ axis_mix
    return mixed.astype(np.float32)

# ── LOW-PASS FILTER ──────────────────────────────────────────────────────────
def lowpass_filter(signal, cutoff_hz=40, sample_rate=100):
    dt = 1.0 / sample_rate
    alpha = (2 * np.pi * cutoff_hz * dt) / (1 + 2 * np.pi * cutoff_hz * dt)
    filtered = np.zeros_like(signal)
    filtered[0] = signal[0]
    for i in range(1, len(signal)):
        filtered[i] = filtered[i - 1] + alpha * (signal[i] - filtered[i - 1])
    return filtered

# ── DATASET GENERATION ───────────────────────────────────────────────────────
print('Generating synthetic IMU dataset...')
X, y = [], []
stroke_names = list(STROKE_PARAMS.keys())

for stroke_name in stroke_names:
    for _ in range(N_PER_CLASS):
        skill = np.random.uniform(0.35, 1.0)  # vary skill level
        signal = generate_stroke(stroke_name, skill)
        # Apply filter to each axis
        filtered = np.stack([
            lowpass_filter(signal[:, i]) for i in range(6)
        ], axis=1)
        X.append(filtered)
        y.append(stroke_name)

X = np.array(X, dtype=np.float32)  # (10000, 120, 6)
y = np.array(y)
print(f'Dataset shape: {X.shape}  |  Classes: {stroke_names}')

# Standardize each sample so the model cannot lean on absolute magnitude alone.
sample_mean = X.mean(axis=1, keepdims=True)
sample_std = X.std(axis=1, keepdims=True) + 1e-6
X = (X - sample_mean) / sample_std

# Encode labels
le = LabelEncoder()
y_enc = le.fit_transform(y)
y_cat = tf.keras.utils.to_categorical(y_enc)

X_train, X_test, y_train, y_test, y_enc_train, y_enc_test = train_test_split(
    X, y_cat, y_enc, test_size=0.2, random_state=RANDOM_SEED, stratify=y_enc
)
X_train, X_val, y_train, y_val = train_test_split(
    X_train, y_train, test_size=0.15, random_state=RANDOM_SEED, stratify=y_enc_train
)

# ── MODEL ARCHITECTURE ───────────────────────────────────────────────────────
def build_model(input_shape, n_classes):
    inputs = layers.Input(shape=input_shape)

    # 1D-CNN block — spatial feature extraction
    x = layers.Conv1D(48, kernel_size=5, activation='relu', padding='same', kernel_regularizer=tf.keras.regularizers.l2(1e-4))(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Conv1D(96, kernel_size=3, activation='relu', padding='same', kernel_regularizer=tf.keras.regularizers.l2(1e-4))(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(pool_size=2)(x)
    x = layers.Dropout(0.35)(x)

    # Stacked LSTM — temporal dependency mapping
    x = layers.LSTM(96, return_sequences=True, dropout=0.2, recurrent_dropout=0.1)(x)
    x = layers.Dropout(0.35)(x)
    x = layers.LSTM(48, dropout=0.15, recurrent_dropout=0.1)(x)
    x = layers.Dropout(0.25)(x)

    # Output
    outputs = layers.Dense(n_classes, activation='softmax')(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model

model = build_model(input_shape=(N_SAMPLES, 6), n_classes=len(stroke_names))
model.summary()

# ── TRAINING ─────────────────────────────────────────────────────────────────
print('\nTraining model...')
history = model.fit(
    X_train, y_train,
    epochs=40,
    batch_size=64,
    validation_data=(X_val, y_val),
    callbacks=[
        tf.keras.callbacks.EarlyStopping(patience=8, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(patience=4, factor=0.5)
    ],
    verbose=1
)

# ── EVALUATION ───────────────────────────────────────────────────────────────
print('\nEvaluating on test set...')
y_pred_prob = model.predict(X_test)
y_pred = np.argmax(y_pred_prob, axis=1)
y_true = np.argmax(y_test, axis=1)

test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
print(f'\nTest accuracy: {test_acc * 100:.2f}%')
print('\nClassification report:')
print(classification_report(y_true, y_pred, target_names=le.classes_))

# ── SAVE PLOTS ────────────────────────────────────────────────────────────────

# 1. Training curve
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
fig.patch.set_facecolor('#0c1117')
for ax in (ax1, ax2):
    ax.set_facecolor('#0c1117')
    ax.tick_params(colors='#94a3b8')
    ax.xaxis.label.set_color('#94a3b8')
    ax.yaxis.label.set_color('#94a3b8')
    ax.title.set_color('#f8fafc')
    for spine in ax.spines.values():
        spine.set_edgecolor('#334155')

ax1.plot(history.history['accuracy'], color='#00e5a0', label='Train')
ax1.plot(history.history['val_accuracy'], color='#3b82f6', label='Validation', linestyle='--')
ax1.set_title('Model Accuracy')
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Accuracy')
ax1.legend(facecolor='#1e293b', labelcolor='#cbd5e1')
ax1.set_ylim(0, 1)

ax2.plot(history.history['loss'], color='#00e5a0', label='Train')
ax2.plot(history.history['val_loss'], color='#3b82f6', label='Validation', linestyle='--')
ax2.set_title('Model Loss')
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Loss')
ax2.legend(facecolor='#1e293b', labelcolor='#cbd5e1')

plt.tight_layout()
plt.savefig('training_curve.png', dpi=150, bbox_inches='tight', facecolor='#0c1117')
print('Saved: training_curve.png')

# 2. Confusion matrix
fig2, ax = plt.subplots(figsize=(7, 6))
fig2.patch.set_facecolor('#0c1117')
ax.set_facecolor('#0c1117')
cm = confusion_matrix(y_true, y_pred)
sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=le.classes_,
    yticklabels=le.classes_,
    ax=ax,
    linewidths=0.5
)
ax.set_title('Confusion Matrix', color='#f8fafc', pad=12)
ax.set_xlabel('Predicted', color='#94a3b8')
ax.set_ylabel('True', color='#94a3b8')
ax.tick_params(colors='#94a3b8', rotation=15)
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=150, bbox_inches='tight', facecolor='#0c1117')
print('Saved: confusion_matrix.png')

# 3. Sample IMU signal per stroke (one figure, 4 subplots)
fig3, axes = plt.subplots(2, 2, figsize=(12, 7))
fig3.patch.set_facecolor('#0c1117')
axes = axes.flatten()
t_axis = np.linspace(0, STROKE_DURATION, N_SAMPLES)

for idx, stroke_name in enumerate(stroke_names):
    ax = axes[idx]
    ax.set_facecolor('#111827')
    sig = generate_stroke(stroke_name, skill=0.85)
    ax.plot(t_axis, sig[:, 0], color='#00e5a0', linewidth=1.5, label='Gx')
    ax.plot(t_axis, sig[:, 1], color='#3b82f6', linewidth=1.5, label='Gy')
    ax.plot(t_axis, sig[:, 2], color='#94a3b8', linewidth=1.2, label='Gz')
    ax.set_title(stroke_name, color='#f8fafc', fontsize=10)
    ax.set_xlabel('Time (s)', color='#94a3b8', fontsize=8)
    ax.set_ylabel('Angular velocity (°/s)', color='#94a3b8', fontsize=8)
    ax.tick_params(colors='#94a3b8', labelsize=7)
    for spine in ax.spines.values():
        spine.set_edgecolor('#334155')
    if idx == 0:
        ax.legend(facecolor='#1e293b', labelcolor='#cbd5e1', fontsize=8)

fig3.suptitle('Virtual IMU Gyroscope Signal — Per Stroke Type', color='#f8fafc', fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('imu_signals.png', dpi=150, bbox_inches='tight', facecolor='#0c1117')
print('Saved: imu_signals.png')

model.save('smashit_model.keras')
print('\nModel saved: smashit_model.keras')
print(f'\nFinal test accuracy: {test_acc * 100:.2f}%')

import React, { createContext, useContext, useReducer } from 'react'
import { DEFAULT_SETTINGS, buildPlayerProfile, seedSessions } from '../data/badmintonData'

const AppContext = createContext(null)

function createInitialState() {
  return {
    playerProfile: buildPlayerProfile(68, 'Amateur', 'Overhead Smash'),
    sessions: seedSessions(),
    simResult: null,
    settings: DEFAULT_SETTINGS,
    backendReady: null
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER_PROFILE':
      return { ...state, playerProfile: action.payload }
    case 'ADD_SESSION':
      return { ...state, sessions: [action.payload, ...state.sessions] }
    case 'SET_SIM_RESULT':
      return { ...state, simResult: action.payload }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_BACKEND_READY':
      return { ...state, backendReady: action.payload }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

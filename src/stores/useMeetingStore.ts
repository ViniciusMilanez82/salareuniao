import { create } from 'zustand'
import type { Meeting, MeetingAgent, Transcript } from '@/types/database.types'

interface MeetingState {
  currentMeeting: Meeting | null
  agents: MeetingAgent[]
  transcripts: Transcript[]
  isSessionActive: boolean
  isPaused: boolean
  speakingAgentId: string | null
  setCurrentMeeting: (meeting: Meeting | null) => void
  setAgents: (agents: MeetingAgent[]) => void
  addTranscript: (transcript: Transcript) => void
  setTranscripts: (transcripts: Transcript[]) => void
  setSpeakingAgent: (agentId: string | null) => void
  setSessionActive: (active: boolean) => void
  setPaused: (paused: boolean) => void
  toggleAgentMute: (agentId: string) => void
  reset: () => void
}

export const useMeetingStore = create<MeetingState>()((set) => ({
  currentMeeting: null,
  agents: [],
  transcripts: [],
  isSessionActive: false,
  isPaused: false,
  speakingAgentId: null,
  setCurrentMeeting: (currentMeeting) => set({ currentMeeting }),
  setAgents: (agents) => set({ agents }),
  addTranscript: (transcript) => set((state) => ({
    transcripts: [...state.transcripts, transcript],
  })),
  setTranscripts: (transcripts) => set({ transcripts }),
  setSpeakingAgent: (speakingAgentId) => set({ speakingAgentId }),
  setSessionActive: (isSessionActive) => set({ isSessionActive }),
  setPaused: (isPaused) => set({ isPaused }),
  toggleAgentMute: (agentId) => set((state) => ({
    agents: state.agents.map((a) =>
      a.agent_id === agentId ? { ...a, is_muted: !a.is_muted } : a
    ),
  })),
  reset: () => set({
    currentMeeting: null,
    agents: [],
    transcripts: [],
    isSessionActive: false,
    isPaused: false,
    speakingAgentId: null,
  }),
}))

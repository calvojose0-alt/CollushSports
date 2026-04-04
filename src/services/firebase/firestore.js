// Firestore Service
// All game data operations — picks, results, players, groups
// Falls back to localStorage in demo mode

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase'

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS = {
  get: (key) => JSON.parse(localStorage.getItem(`collush_${key}`) || 'null'),
  set: (key, val) => localStorage.setItem(`collush_${key}`, JSON.stringify(val)),
  getAll: (key) => JSON.parse(localStorage.getItem(`collush_${key}`) || '[]'),
  push: (key, item) => {
    const arr = LS.getAll(key)
    arr.push(item)
    localStorage.setItem(`collush_${key}`, JSON.stringify(arr))
  },
  update: (key, id, updates) => {
    const arr = LS.getAll(key)
    const idx = arr.findIndex((x) => x.id === id)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...updates }
    localStorage.setItem(`collush_${key}`, JSON.stringify(arr))
  },
}

// ─── GAMES ───────────────────────────────────────────────────────────────────

export async function createGame({ gameId, season, name, createdBy }) {
  const data = {
    id: gameId,
    season,
    name,
    createdBy,
    status: 'active', // active | completed
    currentRaceIndex: 0,
    createdAt: new Date().toISOString(),
  }
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'games', gameId), { ...data, createdAt: serverTimestamp() })
    return data
  }
  LS.push('games', data)
  return data
}

export async function getGame(gameId) {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, 'games', gameId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }
  return LS.getAll('games').find((g) => g.id === gameId) || null
}

// ─── PLAYERS ─────────────────────────────────────────────────────────────────

export async function joinGame({ gameId, userId, displayName }) {
  const playerId = `${gameId}_${userId}`
  const data = {
    id: playerId,
    gameId,
    userId,
    displayName,
    status: 'alive', // alive | eliminated | winner
    points: 0,
    joinedAt: new Date().toISOString(),
  }
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'players', playerId), { ...data, joinedAt: serverTimestamp() })
    return data
  }
  const existing = LS.getAll('players').find((p) => p.id === playerId)
  if (!existing) LS.push('players', data)
  return existing || data
}

export async function getPlayers(gameId) {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'players'), where('gameId', '==', gameId))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  return LS.getAll('players').filter((p) => p.gameId === gameId)
}

export async function updatePlayerStatus(playerId, updates) {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'players', playerId), updates)
    return
  }
  LS.update('players', playerId, updates)
}

export function subscribeToPlayers(gameId, callback) {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'players'), where('gameId', '==', gameId))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }
  // Demo: poll every 2s
  const interval = setInterval(async () => {
    callback(await getPlayers(gameId))
  }, 2000)
  getPlayers(gameId).then(callback)
  return () => clearInterval(interval)
}

// ─── PICKS ───────────────────────────────────────────────────────────────────

export async function submitPick({ gameId, userId, raceId, columnA, columnB }) {
  const pickId = `${gameId}_${userId}_${raceId}`
  const data = {
    id: pickId,
    gameId,
    userId,
    raceId,
    columnA,       // { driverId, driverName }
    columnB,       // { driverId, driverName }
    resultA: null, // 'success' | 'fail' | 'pending'
    resultB: null,
    survived: null,
    pointEarned: false,
    submittedAt: new Date().toISOString(),
  }
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'picks', pickId), { ...data, submittedAt: serverTimestamp() })
    return data
  }
  const existing = LS.getAll('picks').find((p) => p.id === pickId)
  if (existing) {
    LS.update('picks', pickId, { columnA, columnB, submittedAt: data.submittedAt })
    return { ...existing, columnA, columnB }
  }
  LS.push('picks', data)
  return data
}

export async function getPick(gameId, userId, raceId) {
  const pickId = `${gameId}_${userId}_${raceId}`
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, 'picks', pickId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }
  return LS.getAll('picks').find((p) => p.id === pickId) || null
}

export async function getPicksForRace(gameId, raceId) {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'picks'),
      where('gameId', '==', gameId),
      where('raceId', '==', raceId)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  return LS.getAll('picks').filter((p) => p.gameId === gameId && p.raceId === raceId)
}

export async function getPicksForPlayer(gameId, userId) {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'picks'),
      where('gameId', '==', gameId),
      where('userId', '==', userId),
      orderBy('submittedAt', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  return LS.getAll('picks')
    .filter((p) => p.gameId === gameId && p.userId === userId)
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
}

export async function updatePick(pickId, updates) {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'picks', pickId), updates)
    return
  }
  LS.update('picks', pickId, updates)
}

// ─── RACE RESULTS ────────────────────────────────────────────────────────────

export async function saveRaceResult({ gameId, raceId, results }) {
  // results: [{ position, driverId, driverName }]
  const resultId = `${gameId}_${raceId}`
  const data = {
    id: resultId,
    gameId,
    raceId,
    results,
    processedAt: new Date().toISOString(),
    locked: true,
  }
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'raceResults', resultId), { ...data, processedAt: serverTimestamp() })
    return data
  }
  const existing = LS.getAll('raceResults').find((r) => r.id === resultId)
  if (existing) {
    LS.update('raceResults', resultId, data)
    return data
  }
  LS.push('raceResults', data)
  return data
}

export async function getRaceResult(gameId, raceId) {
  const resultId = `${gameId}_${raceId}`
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, 'raceResults', resultId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }
  return LS.getAll('raceResults').find((r) => r.id === resultId) || null
}

export async function getAllRaceResults(gameId) {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'raceResults'), where('gameId', '==', gameId))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  return LS.getAll('raceResults').filter((r) => r.gameId === gameId)
}

// ─── GROUPS ──────────────────────────────────────────────────────────────────

export async function createGroup({ name, createdBy, gameId, inviteCode }) {
  const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const data = {
    id: groupId,
    name,
    createdBy,
    gameId,
    inviteCode,
    members: [createdBy],
    createdAt: new Date().toISOString(),
  }
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'groups', groupId), { ...data, createdAt: serverTimestamp() })
    return data
  }
  LS.push('groups', data)
  return data
}

export async function joinGroupByCode(inviteCode, userId) {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error('Invalid invite code')
    const groupDoc = snap.docs[0]
    const group = { id: groupDoc.id, ...groupDoc.data() }
    if (!group.members.includes(userId)) {
      await updateDoc(doc(db, 'groups', group.id), {
        members: [...group.members, userId],
      })
    }
    return { ...group, members: [...group.members, userId] }
  }
  const groups = LS.getAll('groups')
  const group = groups.find((g) => g.inviteCode === inviteCode)
  if (!group) throw new Error('Invalid invite code')
  if (!group.members.includes(userId)) {
    group.members.push(userId)
    LS.update('groups', group.id, { members: group.members })
  }
  return group
}

export async function getGroupsForUser(userId) {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'groups'), where('members', 'array-contains', userId))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  return LS.getAll('groups').filter((g) => g.members?.includes(userId))
}

export const playNewRequestSound = (audioCtx) => {
  [440, 523.25, 659.25].forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const t = audioCtx.currentTime + i * 0.3
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
    osc.start(t)
    osc.stop(t + 1.0)
  })
}

export const playArrivalSound = (audioCtx) => {
  [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const t = audioCtx.currentTime + i * 0.28
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
    osc.start(t)
    osc.stop(t + 0.9)
  })
}

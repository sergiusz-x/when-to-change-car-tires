"use client"

import { useEffect } from "react"

const SIZE = 64
const C = SIZE / 2
const R = 28
const TICK_MS = 250

// Synced with SeasonBackground.module.css --drive-duration: 30s
// 0-24%: winter, 24-74%: summer, 75-100%: winter
const CYCLE_MS = 30_000

function isWinterPhase(): boolean {
    const t = (performance.now() % CYCLE_MS) / CYCLE_MS
    return t < 0.24 || t >= 0.75
}

function drawWinterTire(ctx: CanvasRenderingContext2D, angle: number) {
    // Dark rubber
    ctx.fillStyle = "#1e2530"
    ctx.beginPath()
    ctx.arc(C, C, R, 0, Math.PI * 2)
    ctx.fill()

    // Deep tread grooves (winter = aggressive pattern)
    ctx.save()
    ctx.translate(C, C)
    ctx.rotate((angle * Math.PI) / 180)

    // Thick sipes / tread blocks
    ctx.strokeStyle = "#4a6a90"
    ctx.lineWidth = 3
    for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14)
        ctx.lineTo(Math.cos(a) * (R - 1), Math.sin(a) * (R - 1))
        ctx.stroke()
    }

    // Cross-hatching between treads (sipe detail)
    ctx.strokeStyle = "#3a5570"
    ctx.lineWidth = 1.5
    for (let i = 0; i < 12; i++) {
        const a1 = (i * Math.PI) / 6
        const a2 = ((i + 1) * Math.PI) / 6
        const mid = (R - 1 + 14) / 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a1) * mid, Math.sin(a1) * mid)
        ctx.lineTo(Math.cos(a2) * mid, Math.sin(a2) * mid)
        ctx.stroke()
    }

    ctx.restore()

    // Sidewall ring
    ctx.strokeStyle = "#5580aa"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(C, C, R - 1, 0, Math.PI * 2)
    ctx.stroke()

    // Rim
    ctx.fillStyle = "#8aa8cc"
    ctx.beginPath()
    ctx.arc(C, C, 11, 0, Math.PI * 2)
    ctx.fill()

    // Rim spokes
    ctx.save()
    ctx.translate(C, C)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.strokeStyle = "#6688aa"
    ctx.lineWidth = 2.5
    for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10)
        ctx.stroke()
    }
    ctx.restore()

    // Hub
    ctx.fillStyle = "#b0c8e0"
    ctx.beginPath()
    ctx.arc(C, C, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#e6f3ff"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(C, C, 4, 0, Math.PI * 2)
    ctx.stroke()

    // Large marker to make rotation clearly visible
    ctx.save()
    ctx.translate(C, C)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.fillStyle = "#e9f3ff"
    ctx.strokeStyle = "#9dc8f2"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-4, -(R - 3))
    ctx.lineTo(4, -(R - 3))
    ctx.lineTo(0, -(R + 3))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Snowflake in center (season indicator)
    ctx.strokeStyle = "#eaf6ff"
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(C - 3, C)
    ctx.lineTo(C + 3, C)
    ctx.moveTo(C, C - 3)
    ctx.lineTo(C, C + 3)
    ctx.moveTo(C - 2.2, C - 2.2)
    ctx.lineTo(C + 2.2, C + 2.2)
    ctx.moveTo(C - 2.2, C + 2.2)
    ctx.lineTo(C + 2.2, C - 2.2)
    ctx.stroke()
}

function drawSummerTire(ctx: CanvasRenderingContext2D, angle: number) {
    // Black rubber
    ctx.fillStyle = "#222226"
    ctx.beginPath()
    ctx.arc(C, C, R, 0, Math.PI * 2)
    ctx.fill()

    // Smooth longitudinal grooves (summer = fewer, cleaner)
    ctx.save()
    ctx.translate(C, C)
    ctx.rotate((angle * Math.PI) / 180)

    ctx.strokeStyle = "#444"
    ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16)
        ctx.lineTo(Math.cos(a) * (R - 1), Math.sin(a) * (R - 1))
        ctx.stroke()
    }

    // Smooth ring grooves (concentric)
    ctx.strokeStyle = "#383838"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, 20, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()

    // Sidewall ring
    ctx.strokeStyle = "#555"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(C, C, R - 1, 0, Math.PI * 2)
    ctx.stroke()

    // Rim (warmer tone)
    ctx.fillStyle = "#c0a870"
    ctx.beginPath()
    ctx.arc(C, C, 11, 0, Math.PI * 2)
    ctx.fill()

    // Rim spokes
    ctx.save()
    ctx.translate(C, C)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.strokeStyle = "#a08850"
    ctx.lineWidth = 2.5
    for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10)
        ctx.stroke()
    }
    ctx.restore()

    // Hub
    ctx.fillStyle = "#d4be88"
    ctx.beginPath()
    ctx.arc(C, C, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#ffe9ae"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(C, C, 4, 0, Math.PI * 2)
    ctx.stroke()

    // Large marker to make rotation clearly visible
    ctx.save()
    ctx.translate(C, C)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.fillStyle = "#ffe5a3"
    ctx.strokeStyle = "#f2b84d"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-4, -(R - 3))
    ctx.lineTo(4, -(R - 3))
    ctx.lineTo(0, -(R + 3))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Sun in center (season indicator)
    ctx.fillStyle = "#ffd64f"
    ctx.beginPath()
    ctx.arc(C, C, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#ffb638"
    ctx.lineWidth = 1.3
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        ctx.beginPath()
        ctx.moveTo(C + Math.cos(a) * 3.2, C + Math.sin(a) * 3.2)
        ctx.lineTo(C + Math.cos(a) * 5.2, C + Math.sin(a) * 5.2)
        ctx.stroke()
    }
}

export default function FaviconAnimator() {
    useEffect(() => {
        let link = document.querySelector<HTMLLinkElement>("#dynamic-favicon")
        if (!link) {
            link = document.createElement("link")
            link.id = "dynamic-favicon"
            link.rel = "icon"
            document.head.appendChild(link)
        }

        const canvas = document.createElement("canvas")
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let angle = 0

        function draw() {
            const winter = isWinterPhase()
            ctx!.clearRect(0, 0, SIZE, SIZE)
            ctx!.imageSmoothingEnabled = true

            if (winter) {
                drawWinterTire(ctx!, angle)
            } else {
                drawSummerTire(ctx!, angle)
            }

            link!.href = `${canvas.toDataURL("image/png")}#${angle}`

            angle = (angle + 20) % 360
        }

        draw()
        const id = setInterval(draw, TICK_MS)

        return () => {
            clearInterval(id)
        }
    }, [])

    return null
}

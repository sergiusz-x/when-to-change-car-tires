import type { Metadata } from "next"
import { Nunito, Sora } from "next/font/google"
import FaviconAnimator from "@/components/FaviconAnimator"
import "./globals.css"

const nunito = Nunito({
    variable: "--font-nunito",
    subsets: ["latin"],
})

const sora = Sora({
    variable: "--font-sora",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Tire Change Advisor",
    description: "Weather-based timing for summer and winter tire changes.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${nunito.variable} ${sora.variable}`}>
                <FaviconAnimator />
                {children}
            </body>
        </html>
    )
}

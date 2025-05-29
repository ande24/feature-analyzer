"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Terminal, TrendingUp } from "lucide-react"

export default function WordUtilityAnalyzer() {
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [word, setWord] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [consoleMessages, setConsoleMessages] = useState<string[]>([])
  const [utilityScore, setUtilityScore] = useState<number | null>(null)
  const [showScore, setShowScore] = useState(false)
  const consoleRef = useRef<HTMLDivElement>(null)

  const addConsoleMessage = (message: string) => {
    setConsoleMessages((prev) => [...prev, message])
  }

  const scrollConsoleToBottom = () => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollConsoleToBottom()
  }, [consoleMessages])

  const handleAnalyze = async () => {
    if (!selectedClass || !word.trim()) return

    setIsProcessing(true)
    setShowScore(false)
    setUtilityScore(null)
    setConsoleMessages([])

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedClass,
          word: word.trim(),
        }),
      })

      if (!response.body) {
        throw new Error("No response body")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim())

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6))

              if (data.type === "console") {
                addConsoleMessage(data.message)
              } else if (data.type === "result") {
                setUtilityScore(data.score)
                setIsProcessing(false)
                setTimeout(() => setShowScore(true), 100)
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error)
      addConsoleMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsProcessing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score === 0) return "text-gray-400"
    if (score < 50) return "text-yellow-500"
    if (score < 100) return "text-orange-500"
    if (score < 200) return "text-red-500"
    return "text-purple-500"
  }

  const getScoreLabel = (score: number) => {
    if (score === 0) return "Not Found"
    if (score < 50) return "Low Utility"
    if (score < 100) return "Medium Utility"
    if (score < 200) return "High Utility"
    return "Very High Utility"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Word Utility Analyzer</h1>
          <p className="text-slate-300">Measure word frequency across different text categories</p>
        </div>

        {/* Controls */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 justify-center">
              <TrendingUp className="w-5 h-5" />
              Analysis Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Category</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="space" className="text-white">
                      🚀 Space
                    </SelectItem>
                    <SelectItem value="sports" className="text-white">
                      ⚽ Sports
                    </SelectItem>
                    <SelectItem value="animals" className="text-white">
                      🦁 Animals
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Word</label>
                <Input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="Enter a word..."
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleAnalyze}
                disabled={!selectedClass || !word.trim() || isProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8"
              >
                <Play className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Console */}
          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Console Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={consoleRef} className="bg-black/50 rounded-lg p-4 h-80 overflow-y-auto font-mono text-sm">
                {consoleMessages.length === 0 ? (
                  <div className="text-slate-500">Console output will appear here...</div>
                ) : (
                  consoleMessages.map((message, index) => (
                    <div
                      key={index}
                      className="text-green-400 mb-1 animate-in fade-in duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {message}
                    </div>
                  ))
                )}
                {isProcessing && (
                  <div className="text-green-400 animate-pulse">
                    <span className="animate-ping">█</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Score Display */}
          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Utility Score</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-80">
              {utilityScore === null ? (
                <div className="text-center text-slate-500">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Run analysis to see utility score</p>
                </div>
              ) : (
                <div
                  className={`text-center transition-all duration-1000 ${showScore ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
                >
                  <div
                    className={`text-6xl font-bold mb-4 ${getScoreColor(utilityScore)} transition-all duration-1000`}
                  >
                    {showScore ? utilityScore.toLocaleString() : "0"}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-lg px-4 py-2 ${getScoreColor(utilityScore)} border-current`}
                  >
                    {getScoreLabel(utilityScore)}
                  </Badge>
                  <div className="mt-4 text-slate-400 text-sm">
                    Word: <span className="text-white font-medium">"{word}"</span>
                  </div>
                  <div className="text-slate-400 text-sm">
                    Category: <span className="text-white font-medium capitalize">{selectedClass}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

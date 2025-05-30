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
  const [showScore, setShowScore] = useState(false)
  const consoleRef = useRef<HTMLDivElement>(null)

  const [userWordScores, setUserWordScores] = useState<{
    word: string;
    scores: { mi: number; chi2: number; frequency: number };
  } | null>(null);

  const [topWords, setTopWords] = useState<{
    mi: { word: string; mutual_information: number }[];
    chi2: { word: string; chi_squared: number }[];
    frequency: { word: string; frequency: number }[];
  }>({ mi: [], chi2: [], frequency: [] });

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
  if (!selectedClass || !word.trim()) return;

  setIsProcessing(true);
  setShowScore(false);
  setConsoleMessages([]);
  setUserWordScores(null);
  setTopWords({ mi: [], chi2: [], frequency: [] });

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
    });

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Save incomplete line for next chunk

      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            console.log("[Analyzer] Received data:", data);
            if (data.type === "console") {
              addConsoleMessage(data.message);
            } else if (data.type === "result") {
              // Defensive: handle both new and legacy structures
              if (data.input_word && data.top_words) {
                setUserWordScores(data.input_word);
                setTopWords(data.top_words);
              } else if (data.word && typeof data.score === "number") {
                setUserWordScores({
                  word: data.word,
                  scores: { mi: data.score, chi2: 0, frequency: 0 },
                  ...(data.error ? { error: data.error } : {})
                });
                setTopWords({ mi: [], chi2: [], frequency: [] });
              }
              setIsProcessing(false);
              setShowScore(true);
            }
          } catch (e) {
            // Ignore parse errors for non-JSON lines
          }
        }
      }
    }
  } catch (error) {
    console.error("Analysis failed:", error);
    addConsoleMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    setIsProcessing(false);
  }
};


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
          <h1 className="text-4xl font-bold text-white">Utility Measure Analyzer</h1>
          <p className="text-slate-300">Measure feature utility across different text categories</p>
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
                    <SelectItem value="sci_space" className="text-white">
                      🚀 Space
                    </SelectItem>
                    <SelectItem value="rec_autos" className="text-white">
                      🚗 Cars
                    </SelectItem>
                    <SelectItem value="rec_sport_hockey" className="text-white">
                      🏒 Hockey
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
                {isProcessing ? "Processing, this might take a minute..." : "Analyze"}
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
                  <>
                    {consoleMessages.map((message, index) => (
                      <div
                        key={index}
                        className="text-green-400 mb-1 animate-in fade-in duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {message}
                      </div>
                    ))}
                  </>
                )}
                {isProcessing && (
                  <div className="text-green-400 animate-pulse">
                    <span className="animate-ping">█</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Word Scores and Top Words Display */}
          <Card className="bg-slate-900/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-80 w-full">
              {!showScore || !userWordScores ? (
                <div className="text-center text-slate-500 w-full">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4 items-center">
                  {/* User Word Scores */}
                  <h3 className="text-lg font-semibold text-white text-center mb-2">Your Word: <span className="text-purple-400">{userWordScores.word}</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="bg-slate-800 col-span-1 rounded-lg px-4 py-2 text-center">
                      <div className="text-xs text-slate-400">Mutual Information</div>
                      <div className="text-2xl font-bold text-purple-400">{userWordScores.scores.mi?.toFixed(5) ?? 0}</div>
                    </div>
                    <div className="bg-slate-800  col-span-1  rounded-lg px-4 py-2 text-center">
                      <div className="text-xs text-slate-400">Chi²</div>
                      <div className="text-2xl font-bold text-purple-400">{userWordScores.scores.chi2?.toFixed(2) ?? 0}</div>
                    </div>
                    <div className="bg-slate-800  col-span-1  rounded-lg px-4 py-2 text-center">
                      <div className="text-xs text-slate-400">Frequency</div>
                      <div className="text-2xl font-bold text-purple-400">{userWordScores.scores.frequency ?? 0}</div>
                    </div>
                  </div>
                    
                  {/* Top Words Leaderboards */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-2 text-center">Top MI Words</div>
                      <ol className="list-decimal list-inside space-y-1">
                        {topWords.mi.map((item) => (
                          <li key={item.word} className="flex justify-between text-slate-200">
                            <span>{item.word}</span>
                            <span className="text-purple-400">{typeof item.mutual_information === "number" ? item.mutual_information.toFixed(5) : "0"}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-2 text-center">Top Chi² Words</div>
                      <ol className="list-decimal list-inside space-y-1">
                        {topWords.chi2.map((item) => (
                          <li key={item.word} className="flex justify-between text-slate-200">
                            <span>{item.word}</span>
                            <span className="text-purple-400">{typeof item.chi_squared === "number" ? item.chi_squared.toFixed(2) : "0"}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-2 text-center">Top Frequency Words</div>
                      <ol className="list-decimal list-inside space-y-1">
                        {topWords.frequency.map((item) => (
                          <li key={item.word} className="flex justify-between text-slate-200">
                            <span>{item.word}</span>
                            <span className="text-purple-400">{typeof item.frequency === "number" ? item.frequency : "0"}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
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

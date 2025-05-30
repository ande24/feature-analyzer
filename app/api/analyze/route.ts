import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const { category, word } = await request.json()

    if (!category || !word) {
      return NextResponse.json({ error: "Category and word are required" }, { status: 400 })
    }

    const scriptPath = path.join(process.cwd(), "scripts", "analyze_word.py")

    return new Response(
      new ReadableStream({
        start(controller) {
          const python = spawn("python", [scriptPath, category, word])

            type AnalyzeResult = { score: number; word: string; category: string; error?: string }
            let finalResult: any = null

          python.stdout.on("data", (data) => {
            const output = data.toString()
            const lines: string[] = output.split("\n").filter((line: string) => line.trim())

            for (const line of lines) {
              if (line.startsWith("RESULT:")) {
                try {
                  finalResult = JSON.parse(line.substring(7))
                  console.log("[API/analyze] Raw Python RESULT:", finalResult);
                } catch (e) {
                  console.error("Failed to parse result:", e)
                }
              } else if (line.trim()) {
                // Send console message
                controller.enqueue(`data: ${JSON.stringify({ type: "console", message: line.trim() })}\n\n`)
              }
            }
          })

          python.stderr.on("data", (data) => {
            const error = data.toString().trim()
            if (error) {
              controller.enqueue(`data: ${JSON.stringify({ type: "console", message: `Error: ${error}` })}\n\n`)
            }
          })

          python.on("close", (code) => {
            if (finalResult) {
              // Handle new structure from analyze_top_words
              if (
                finalResult.input_word &&
                typeof finalResult.input_word.word === "string" &&
                typeof finalResult.input_word.mutual_information === "number" &&
                typeof finalResult.input_word.chi_squared === "number" &&
                typeof finalResult.input_word.frequency === "number" &&
                Array.isArray(finalResult.top_words)
              ) {
                // Map top_words to leaderboard structure
                const top_words = {
                  mi: (finalResult.top_words as any[]).map((w: any) => ({ word: w.word, score: w.mutual_information })),
                  chi2: (finalResult.top_words as any[]).map((w: any) => ({ word: w.word, score: w.chi_squared })),
                  frequency: (finalResult.top_words as any[]).map((w: any) => ({ word: w.word, score: w.frequency })),
                };
                const input_word = {
                  word: finalResult.input_word.word,
                  scores: {
                    mi: finalResult.input_word.mutual_information,
                    chi2: finalResult.input_word.chi_squared,
                    frequency: finalResult.input_word.frequency,
                  },
                  ...(finalResult.error ? { error: finalResult.error } : {})
                };
                const resultData = {
                  type: "result",
                  input_word,
                  top_words,
                };
                console.log("[API/analyze] Sending result (analyze_top_words):", resultData);
                controller.enqueue(
                  `data: ${JSON.stringify(resultData)}\n\n`,
                );
              } else if (
                typeof finalResult.word === "string" &&
                (typeof finalResult.mutual_information === "number" || typeof finalResult.mi === "number") &&
                (typeof finalResult.frequency === "number")
              ) {
                // Use chi2 if present, else 0
                const mi = finalResult.mutual_information ?? finalResult.mi ?? 0;
                const chi2 = finalResult.chi2 ?? 0;
                const frequency = finalResult.frequency ?? 0;
                const error = finalResult.error;
                const top_words = finalResult.top_words ?? { mi: [], chi2: [], frequency: [] };
                const resultData = {
                  type: "result",
                  input_word: {
                    word: finalResult.word,
                    scores: { mi, chi2, frequency },
                    ...(error ? { error } : {}),
                  },
                  top_words,
                };
                console.log("[API/analyze] Sending result (legacy):", resultData);
                controller.enqueue(
                  `data: ${JSON.stringify(resultData)}\n\n`,
                );
              } else {
                // Fallback: send the original result
                console.log("[API/analyze] Sending fallback result:", finalResult);
                controller.enqueue(`data: ${JSON.stringify({ type: "result", ...finalResult })}\n\n`);
              }
            } else {
              const noResult = { type: "result", score: 0, word, category, error: "No result received" };
              console.log("[API/analyze] Sending no result:", noResult);
              controller.enqueue(
                `data: ${JSON.stringify(noResult)}\n\n`,
              );
            }
            controller.close();
          })

          python.on("error", (error) => {
            controller.enqueue(
              `data: ${JSON.stringify({ type: "console", message: `Process error: ${error.message}` })}\n\n`,
            )
            controller.enqueue(
              `data: ${JSON.stringify({ type: "result", score: 0, word, category, error: error.message })}\n\n`,
            )
            controller.close()
          })
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    )
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

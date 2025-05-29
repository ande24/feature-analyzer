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
          const python = spawn("python3", [scriptPath, category, word])

          let finalResult = null

          python.stdout.on("data", (data) => {
            const output = data.toString()
            const lines = output.split("\n").filter((line) => line.trim())

            for (const line of lines) {
              if (line.startsWith("RESULT:")) {
                try {
                  finalResult = JSON.parse(line.substring(7))
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
              controller.enqueue(`data: ${JSON.stringify({ type: "result", ...finalResult })}\n\n`)
            } else {
              controller.enqueue(
                `data: ${JSON.stringify({ type: "result", score: 0, word, category, error: "No result received" })}\n\n`,
              )
            }
            controller.close()
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

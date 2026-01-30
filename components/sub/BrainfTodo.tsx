"use client";

import React, { useEffect, useRef, useState } from "react";

type Todo = { id: number; text: string; done: boolean };

export default function BrainfTodo() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [bfCode, setBfCode] = useState<string>("");
  const outBufRef = useRef<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("todos");
    if (raw) {
      try {
        setTodos(JSON.parse(raw));
      } catch {}
    }
  }, []);

  function buildBracketMap(code: string) {
    const map: Record<number, number> = {};
    const stack: number[] = [];
    for (let i = 0; i < code.length; i++) {
      if (code[i] === "[") stack.push(i);
      else if (code[i] === "]") {
        const open = stack.pop();
        if (open === undefined) throw new Error("Unmatched ]");
        map[open] = i;
        map[i] = open;
      }
    }
    return map;
  }

  function runBrainfuck(code: string, onOutputByte: (b: number) => void) {
    const tape = new Uint8Array(30000);
    let ptr = 0;
    const bracketMap = buildBracketMap(code);
    for (let pc = 0; pc < code.length; pc++) {
      const instr = code[pc];
      switch (instr) {
        case ">":
          ptr++;
          if (ptr >= tape.length) ptr = 0;
          break;
        case "<":
          ptr--;
          if (ptr < 0) ptr = tape.length - 1;
          break;
        case "+":
          tape[ptr] = (tape[ptr] + 1) & 0xff;
          break;
        case "-":
          tape[ptr] = (tape[ptr] - 1) & 0xff;
          break;
        case ".":
          onOutputByte(tape[ptr]);
          break;
        case ",":
          tape[ptr] = 0;
          break;
        case "[":
          if (tape[ptr] === 0) pc = bracketMap[pc];
          break;
        case "]":
          if (tape[ptr] !== 0) pc = bracketMap[pc];
          break;
      }
    }
  }

  function handleOutputByte(b: number) {
    outBufRef.current += String.fromCharCode(b);
    let idx;
    while ((idx = outBufRef.current.indexOf("\n")) !== -1) {
      const line = outBufRef.current.slice(0, idx);
      outBufRef.current = outBufRef.current.slice(idx + 1);
      processControlLine(line);
    }
  }

  function processControlLine(line: string) {
    setLog((s) => [...s, `BF -> ${JSON.stringify(line)}`]);
    if (line.startsWith("\u0001SET:")) {
      const rest = line.slice(5);
      const colon = rest.indexOf(":");
      if (colon === -1) return;
      const key = rest.slice(0, colon);
      const value = rest.slice(colon + 1);
      localStorage.setItem(key, value);
      if (key === "todos") setTodos(JSON.parse(value));
    } else if (line.startsWith("\u0003DEL:")) {
      const key = line.slice(5);
      localStorage.removeItem(key);
      if (key === "todos") setTodos([]);
    }
  }

  function compileToBF(s: string) {
    let code = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      code += "[-]" + "+".repeat(ch) + ".>";
    }
    return code;
  }

  function runCommandThroughBF(cmd: string) {
    const bf = compileToBF(cmd + "\n");
    setBfCode(bf);
    runBrainfuck(bf, handleOutputByte);
  }

  function addTodo(text: string) {
    const id = Date.now();
    const next = [...todos, { id, text, done: false }];
    runCommandThroughBF(`\u0001SET:todos:${JSON.stringify(next)}`);
  }

  function toggleTodo(id: number) {
    const next = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    runCommandThroughBF(`\u0001SET:todos:${JSON.stringify(next)}`);
  }

  function removeTodo(id: number) {
    const next = todos.filter((t) => t.id !== id);
    runCommandThroughBF(`\u0001SET:todos:${JSON.stringify(next)}`);
  }

  function clearTodos() {
    runCommandThroughBF(`\u0003DEL:todos`);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-extrabold mb-4">
        🧠📝 Brainf*ck Todo — Next.js + localStorage
      </h1>
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 p-2 border rounded"
          placeholder="Add todo"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => {
            if (input.trim()) {
              addTodo(input.trim());
              setInput("");
            }
          }}
        >
          Add
        </button>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded"
          onClick={() => clearTodos()}
        >
          Clear
        </button>
      </div>
      <ul className="space-y-2 mb-6">
        {todos.map((t) => (
          <li key={t.id} className="flex items-center gap-3 p-3 border rounded">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggleTodo(t.id)}
            />
            <span className={t.done ? "line-through text-slate-400" : ""}>
              {t.text}
            </span>
            <button
              className="ml-auto px-3 py-1 bg-yellow-500 rounded"
              onClick={() => removeTodo(t.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <details className=" p-3 rounded mb-4">
        <summary className="cursor-pointer font-medium">
          🔬 Debug / Logs
        </summary>
        <div className="mt-2 text-xs">
          <button
            className="px-2 py-1 bg-black text-white rounded text-[11px] mb-2"
            onClick={() => setLog([])}
          >
            Clear Log
          </button>
          <div className="h-48 overflow-auto p-2  border mt-2">
            {log.map((l, i) => (
              <div key={i} className="mb-1">
                {l}
              </div>
            ))}
          </div>
        </div>
      </details>
      <details className=" p-3 rounded">
        <summary className="cursor-pointer font-medium">
          💻 Brainf*ck Code (This makes it all work)
        </summary>
        <pre className="mt-2 p-2  border h-64 overflow-auto text-xs font-mono">
          {bfCode}
        </pre>
      </details>
    </div>
  );
}

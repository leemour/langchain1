# Complete Debugging Guide

## 🎯 Quick Start

### VSCode Debugging (Easiest)
1. Open any TypeScript file (e.g., `scripts/test-graph.ts`)
2. Click left of line number to add a breakpoint (red dot)
3. Press **F5**
4. Select configuration (e.g., "Debug Current File")
5. Debug! ✨

### Terminal Debugging (Most Flexible)
1. Run: `pnpm test:graph:debug`
2. Press **Ctrl+Shift+P** → "Debug: Attach to Node Process"
3. Debug! ✨

---

## 📚 Table of Contents

- [VSCode Debugging](#vscode-debugging)
- [Terminal Debugging](#terminal-debugging)
- [Debug Configurations](#debug-configurations)
- [Debug Scripts](#debug-scripts)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)
- [Pro Tips](#pro-tips)

---

## 🐛 VSCode Debugging

### Basic Setup

**What you have:**
- `.vscode/launch.json` - Pre-configured debug setups
- Multiple configurations for different scenarios
- TypeScript support with path aliases (`@/config`, `@/storage`, etc.)

### Quick Debug Methods

#### Method 1: Debug Current File
1. Open any `.ts` file
2. Add breakpoint (click left of line number)
3. Press **F5**
4. Select "Debug Current File"

**When to use:** Quick debugging of any script

#### Method 2: Debug Specific Script
1. Click Debug icon in sidebar (bug icon)
2. Select configuration from dropdown:
   - "Debug Test Graph"
   - "Debug Main App"  
   - "Debug Ingest"
3. Press **F5** or green play button

**When to use:** Always debug the same script

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F5** | Start debugging / Continue |
| **F9** | Toggle breakpoint |
| **F10** | Step over (next line) |
| **F11** | Step into (enter function) |
| **Shift+F11** | Step out (exit function) |
| **Shift+F5** | Stop debugging |
| **Ctrl+Shift+D** | Open debug panel |

### Debug Panel Features

When debugging, you'll see:

```
┌────────────────────────────────────┐
│ Debug Console                      │
│ > question                         │
│   "What tours are available?"      │
│ > state.documents.length           │
│   2                                │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Variables                          │
│ ▼ Local                           │
│   question: "What tours..."        │
│   graph: CompiledStateGraph        │
│   result: {...}                    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Call Stack                         │
│ main (test-graph.ts:36)           │
│ <anonymous> (test-graph.ts:54)    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Watch                              │
│ + Add Expression                   │
│ state.documents.length: 2          │
│ chunks.length: 3                   │
└────────────────────────────────────┘
```

### Using Breakpoints

#### Regular Breakpoint
Click left of line number → red dot appears

#### Conditional Breakpoint
Right-click breakpoint → "Edit Breakpoint"
```typescript
i > 5  // Only breaks when condition is true
```

#### Logpoint (No pause, just log)
Right-click line → "Add Logpoint"
```
Question: {question}, Docs: {documents.length}
```

### Using `debugger` Statement

```typescript
async function main() {
  console.log('Starting...')
  
  debugger; // Execution will pause here automatically
  
  const result = await graph.invoke({...})
  
  debugger; // And here
  
  console.log(result)
}
```

**Advantage:** Works everywhere (VSCode, Chrome, terminal)

---

## 💻 Terminal Debugging

### Why Terminal Debugging?

- ✅ See terminal output in real-time
- ✅ Debug on remote servers (SSH)
- ✅ Works without opening VSCode
- ✅ Choose your debugger (VSCode, Chrome, or CLI)

### Method 1: Terminal + VSCode (Recommended)

**Step 1 - Terminal: Start debug server**
```bash
pnpm test:graph:debug
```

**Output:**
```
Debugger listening on ws://127.0.0.1:9229/abc-123-def
For help, see: https://nodejs.org/en/docs/inspector
```

**Step 2 - VSCode: Attach**

**Option A: Quick Attach**
1. Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. Type: "Debug: Attach to Node Process"
3. Select the process (usually first one)

**Option B: Use Configuration**
1. Open Debug panel (bug icon)
2. Select "Attach to Process" from dropdown
3. Press F5

**Now you can:**
- ✅ Set breakpoints in VSCode
- ✅ See terminal output
- ✅ Use all VSCode debug features

### Method 2: Terminal + Chrome DevTools

**Step 1 - Terminal:**
```bash
pnpm test:graph:debug
```

**Step 2 - Chrome:**
1. Open Chrome
2. Go to: `chrome://inspect`
3. Click "inspect" under "Remote Target"

**Chrome DevTools opens with:**
- Sources tab (breakpoints, step through)
- Console (evaluate expressions)
- Call stack & scope variables
- Network tab (see API calls)

**Advantage:** Works anywhere with Chrome, no VSCode needed!

### Method 3: Pure Terminal (CLI)

**For SSH/remote servers:**

```bash
# Terminal 1: Start with inspect
pnpm test:graph:debug

# Terminal 2: Attach with CLI
node inspect localhost:9229
```

**Commands:**
- `cont` or `c` - Continue
- `next` or `n` - Step to next line
- `step` or `s` - Step into function
- `out` or `o` - Step out
- `repl` - Enter REPL to inspect variables
- `exec state.documents.length` - Execute expression
- `list()` - Show source code
- `sb()` - Set breakpoint

---

## 🎛️ Debug Configurations

Your `.vscode/launch.json` has these configurations:

### 1. Debug Current File
```json
{
  "name": "Debug Current File",
  "program": "${file}"
}
```

**What it does:** Debugs whatever file is currently open

**Use when:** Testing different scripts quickly

**Example:**
1. Open `scripts/test-graph.ts`
2. Press F5
3. Select "Debug Current File"
4. Done!

### 2. Debug Test Graph
```json
{
  "name": "Debug Test Graph",
  "program": "${workspaceFolder}/scripts/test-graph.ts"
}
```

**What it does:** Always debugs `test-graph.ts`

**Use when:** Repeatedly debugging the same script

### 3. Debug Main App
```json
{
  "name": "Debug Main App",
  "program": "${workspaceFolder}/src/index.ts"
}
```

**What it does:** Debugs your main application

**Use when:** Testing the main RAG agent

### 4. Debug Ingest
```json
{
  "name": "Debug Ingest",
  "program": "${workspaceFolder}/scripts/ingest-docs.ts"
}
```

**What it does:** Debugs document ingestion

**Use when:** Issues with loading/chunking documents

### 5. Attach to Process
```json
{
  "name": "Attach to Process",
  "request": "attach",
  "port": 9229
}
```

**What it does:** Attaches to running debug server

**Use when:** Using terminal debugging

### How Configurations Work

**Key parts:**
```json
{
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/tsx",
  // ↑ Uses tsx to run TypeScript directly
  
  "program": "${file}",
  // ↑ ${file} = currently open file
  // ↑ Or use absolute path: "${workspaceFolder}/scripts/test-graph.ts"
  
  "sourceMaps": true,
  // ↑ Maps compiled JS back to TypeScript
  
  "skipFiles": ["<node_internals>/**"]
  // ↑ Skip Node.js internal code in stack traces
}
```

---

## 🎬 Debug Scripts

Your `package.json` has these debug scripts:

### `test:graph:debug` - Pause at Start
```bash
pnpm test:graph:debug
```

**Command:** `tsx --inspect-brk scripts/test-graph.ts`

**What it does:**
- Starts debugger
- **Pauses before first line**
- Waits for you to attach

**Use when:** 
- Need to debug from the very beginning
- Want to set breakpoints before execution starts

### `test:graph:inspect` - Don't Pause
```bash
pnpm test:graph:inspect
```

**Command:** `tsx --inspect scripts/test-graph.ts`

**What it does:**
- Starts debugger
- **Runs normally** (doesn't pause)
- Only pauses at `debugger;` statements

**Use when:**
- Have `debugger;` statements in code
- Only need to debug specific parts

### `ingest:debug` - Debug Ingestion
```bash
pnpm ingest:debug
```

**Debugs:** Document ingestion script

### `dev:inspect` - Debug with Live Reload
```bash
pnpm dev:inspect
```

**What it does:**
- Runs main app with nodemon
- Debugger always enabled
- Restarts when files change
- Debug connection persists

**Use when:** Developing and want continuous debugging

---

## 🔧 Common Workflows

### Workflow 1: Quick Debug of Current File

```bash
# Steps:
1. Open any .ts file in VSCode
2. Add breakpoint (click left of line number)
3. Press F5
4. Select "Debug Current File"
5. Done!
```

**Time:** ~5 seconds

### Workflow 2: Debug Specific Section

**Add `debugger;` where you want to pause:**
```typescript
async function main() {
  const graph = createDocumentSearchGraph({...})
  
  for (const question of questions) {
    debugger; // Will pause here
    
    const result = await graph.invoke({...})
    
    debugger; // And here
    
    console.log(result.answer)
  }
}
```

**Then run:**
```bash
pnpm test:graph:inspect
```

**Attach:** Ctrl+Shift+P → "Debug: Attach to Node Process"

### Workflow 3: Debug from Start (Terminal)

```bash
# Terminal
pnpm test:graph:debug

# VSCode
Ctrl+Shift+P → "Debug: Attach to Node Process"

# Set breakpoints
# Press F5 to continue to first breakpoint
```

### Workflow 4: Debug with Console Output

**Want to see both debug UI and terminal output?**

```bash
# Terminal 1: Run with debug
pnpm test:graph:debug

# VSCode: Attach and debug
# Terminal output stays visible!
```

### Workflow 5: Debug Multiple Scripts

```bash
# Terminal 1: Debug test-graph
pnpm test:graph:debug

# Terminal 2: Debug ingest (different port)
tsx --inspect-brk=9230 scripts/ingest-docs.ts

# VSCode: Attach to either on their respective ports
```

### Workflow 6: Debug on Error

```typescript
try {
  const result = await graph.invoke({...})
} catch (error) {
  debugger; // Pauses when error occurs
  console.error('Error:', error)
  throw error
}
```

### Workflow 7: Conditional Debugging

```typescript
if (process.env.DEBUG) {
  debugger; // Only pauses if DEBUG=true
}
```

```bash
DEBUG=true pnpm test:graph:inspect
```

---

## 🔧 Troubleshooting

### "Cannot connect to runtime process"

**Cause:** Debug server not running or wrong port

**Solution:**
```bash
# Check if process is running
ps aux | grep inspect

# Check if port 9229 is in use
lsof -i :9229

# Kill if needed
kill -9 <PID>

# Restart debug server
pnpm test:graph:debug
```

### "Cannot find package '@/config'"

**Cause:** Path aliases not resolved (old issue, now fixed!)

**Solution:** Scripts now use `tsx --inspect-brk` which handles path aliases correctly

**If you still get this:**
```bash
# Make sure you're using the updated scripts
pnpm test:graph:debug  # NOT: node --inspect-brk
```

### Breakpoints are gray/hollow (not active)

**Causes & Solutions:**

**1. File not executed yet**
- Breakpoint will turn red once file loads
- Press F5 to continue execution

**2. Source maps issue**
- Restart debug session
- Make sure `"sourceMaps": true` in launch.json (already there)

**3. Use `debugger;` statement instead**
```typescript
debugger; // This ALWAYS works
```

### "Program not found" when debugging

**Cause:** Wrong path in launch.json

**Solution:** Paths use `${workspaceFolder}`:
```json
"program": "${workspaceFolder}/scripts/test-graph.ts"
```

If file exists and still fails, try absolute path.

### Port 9229 already in use

**Cause:** Previous debug session still running

**Solution:**
```bash
# Find process using port
lsof -i :9229

# Kill it
kill -9 <PID>

# Or use different port
tsx --inspect-brk=9230 scripts/test-graph.ts
```

### Can't see variable values

**Causes:**

**1. Variable not in scope**
- Check Call Stack panel
- Variables only visible in current scope

**2. Variable is optimized away**
- Add to Watch panel: `state.documents.length`
- Use Debug Console: `console.log(state)`

**3. Try evaluating in Debug Console**
```javascript
state
JSON.stringify(result, null, 2)
chunks.map(c => c.metadata.source)
```

### Debugger not pausing at breakpoint

**Solutions:**

**1. Make sure code is executed**
- Breakpoint in function? Make sure function is called
- Add `console.log()` to verify

**2. Use `debugger;` statement**
```typescript
debugger; // Guaranteed to work
```

**3. Check "Skip Files" setting**
- Might be skipping your code
- Remove skip patterns if needed

### Remote debugging (SSH) not working

**On remote server:**
```bash
# Allow external connections (use with caution!)
tsx --inspect-brk=0.0.0.0:9229 scripts/test-graph.ts
```

**On local machine:**
```bash
# Create SSH tunnel
ssh -L 9229:localhost:9229 user@remote-server

# Attach to localhost:9229
```

**Security:** Only use `0.0.0.0` on trusted networks!

---

## 💡 Pro Tips

### Tip 1: Conditional Breakpoints

Right-click breakpoint → "Edit Breakpoint"

```typescript
// Only break when condition is true
for (let i = 0; i < 100; i++) {
  processItem(i)  // Breakpoint: i > 95
}
```

**Use cases:**
- Break on specific iteration
- Break when variable reaches value
- Break on error condition

### Tip 2: Logpoints (Non-breaking)

Right-click line → "Add Logpoint"

```
Question: {question}, Docs: {documents.length}, Iterations: {iterations}
```

**Advantage:** Logs without stopping execution!

### Tip 3: Watch Expressions

Add to Watch panel:
```javascript
state.documents.length
JSON.stringify(result, null, 2)
chunks.map(c => c.metadata.source)
question.length > 50
```

**Updates automatically** as you step through code!

### Tip 4: Debug Console is Powerful

While paused, evaluate any expression:
```javascript
// Check state
state

// Transform data
documents.map(d => ({ source: d.metadata.source, length: d.pageContent.length }))

// Test functions
JSON.stringify(result, null, 2)

// Modify variables (careful!)
question = "New question"
```

### Tip 5: Skip Node Internals

Already configured in `launch.json`:
```json
"skipFiles": [
  "<node_internals>/**"
]
```

**Add more to skip library code:**
```json
"skipFiles": [
  "<node_internals>/**",
  "**/node_modules/@langchain/**",  // Skip LangChain internals
  "**/node_modules/@qdrant/**"      // Skip Qdrant internals
]
```

### Tip 6: Debug Multiple Processes

```bash
# Terminal 1: Test graph on default port
pnpm test:graph:debug

# Terminal 2: Ingest on different port
tsx --inspect-brk=9230 scripts/ingest-docs.ts

# Attach to both in VSCode!
```

### Tip 7: Environment Variables

```bash
# Set env vars before debugging
DEBUG=true NODE_ENV=test pnpm test:graph:debug
```

Or add to launch.json:
```json
{
  "name": "Debug Test Graph (Verbose)",
  "env": {
    "DEBUG": "true",
    "NODE_ENV": "test"
  }
}
```

### Tip 8: Copy Value as JSON

Right-click variable → "Copy Value"

Pastes as JSON for easy inspection!

### Tip 9: Restart Frame

In Call Stack panel, right-click frame → "Restart Frame"

**Re-runs function from start** (keeps breakpoints)!

### Tip 10: Exception Breakpoints

Debug panel → "Breakpoints" section → Check "Uncaught Exceptions"

**Automatically pauses on any unhandled error!**

---

## 📊 Quick Reference

### Debugging Methods

| Method | Start | Attach | Best For |
|--------|-------|--------|----------|
| **VSCode Direct** | F5 in VSCode | Automatic | Quick debugging |
| **Terminal + VSCode** | `pnpm test:graph:debug` | Ctrl+Shift+P → Attach | See output + debug |
| **Terminal + Chrome** | `pnpm test:graph:debug` | `chrome://inspect` | No VSCode |
| **CLI** | `pnpm test:graph:debug` | `node inspect localhost:9229` | Remote/SSH |

### Debug Scripts

| Script | Command | Pauses? | Use When |
|--------|---------|---------|----------|
| `test:graph` | `tsx scripts/test-graph.ts` | No | Normal run |
| `test:graph:debug` | `tsx --inspect-brk` | Yes (at start) | Debug from beginning |
| `test:graph:inspect` | `tsx --inspect` | No (unless `debugger;`) | Debug specific parts |
| `dev:inspect` | `nodemon --inspect` | No | Live reload debug |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F5** | Start / Continue |
| **F9** | Toggle breakpoint |
| **F10** | Step over |
| **F11** | Step into |
| **Shift+F11** | Step out |
| **Shift+F5** | Stop |
| **Ctrl+Shift+D** | Open debug panel |
| **Ctrl+Shift+P** | Command palette (attach) |

### Debug Panel

| Panel | What It Shows |
|-------|---------------|
| **Variables** | All variables in current scope |
| **Watch** | Custom expressions you want to track |
| **Call Stack** | How you got here (function calls) |
| **Breakpoints** | All breakpoints, can enable/disable |
| **Debug Console** | Evaluate expressions, see output |

---

## 🎬 Complete Example Walkthrough

Let's debug the graph execution step by step:

### Step 1: Prepare Code

```typescript
// scripts/test-graph.ts
async function main() {
  console.log('Starting...')
  
  const graph = createDocumentSearchGraph({
    vectorStore: chunksStore,
    embeddingModel,
    topK: 3
  })
  
  for (const question of questions) {
    debugger; // Will pause here
    
    const result = await graph.invoke({
      question,
      conversationHistory: [],
      documents: [],
      needsRetrieval: true,
      needsRefinement: false,
      refinedQuery: '',
      answer: '',
      iterations: 0,
      retrievalCount: 0
    })
    
    debugger; // Will pause here too
    
    console.log(result.answer)
  }
}
```

### Step 2: Start Debug Server

```bash
pnpm test:graph:inspect
```

**Output:**
```
Debugger listening on ws://127.0.0.1:9229/abc-123
🕸️  Starting LangGraph RAG Agent...
```

### Step 3: Attach Debugger

**VSCode:**
1. Press `Ctrl+Shift+P`
2. Type: "attach"
3. Select: "Debug: Attach to Node Process"
4. Click first process

**Or use Chrome:**
1. Open `chrome://inspect`
2. Click "inspect"

### Step 4: First Breakpoint Hit

**When hitting first `debugger;`:**

**Variables panel shows:**
```
▼ Local
  question: "What tours are available in Valencia?"
  graph: CompiledStateGraph { ... }
  questions: Array(3)
  embeddingModel: OpenAIEmbeddings { ... }
```

**Debug Console - try these:**
```javascript
> question
"What tours are available in Valencia?"

> question.length
39

> questions
["What tours...", "How do I...", "What are..."]
```

### Step 5: Step Through Execution

**Press F11 (Step Into)** to go inside `graph.invoke()`

**Watch the graph execute:**
- Enters analyze node
- Goes to retrieve node
- Fetches documents
- Generates answer

**Or press F10 (Step Over)** to skip internal execution

### Step 6: Second Breakpoint

**After `graph.invoke()` completes:**

**Variables panel now shows:**
```
▼ Local
  question: "What tours..."
  result: {
    answer: "In Valencia, Asturio Club offers..."
    documents: Array(2)
    iterations: 1
    retrievalCount: 1
  }
```

**Inspect result:**
```javascript
> result.answer
"In Valencia, Asturio Club offers the following tours:..."

> result.documents.length
2

> result.documents[0].slice(0, 100)
"[Document 1] (Source: .../01_excursions_valencia.md)\n# Excursions in Valencia..."
```

### Step 7: Continue or Stop

**Press F5** to continue to next question (next `debugger;`)

**Or Shift+F5** to stop debugging

---

## 🚀 Summary

### You Have Three Debugging Setups:

**1. VSCode Direct**
- Press F5, select config, done!
- Best for: Quick debugging

**2. Terminal + Attach**
- `pnpm test:graph:debug`, then attach
- Best for: See output while debugging

**3. Chrome DevTools**
- `pnpm test:graph:debug`, open `chrome://inspect`
- Best for: When VSCode not available

### Key Takeaways:

- ✅ **Use `tsx --inspect-brk`** for TypeScript debugging (handles path aliases)
- ✅ **`debugger;` statement** works everywhere, always
- ✅ **Debug Console** is powerful - evaluate any expression
- ✅ **Conditional breakpoints** save time
- ✅ **Watch panel** tracks values automatically
- ✅ **Terminal debugging** gives you flexibility

### Best Practices:

1. **Start simple:** Use VSCode F5 for quick tests
2. **Use `debugger;`:** When you know exactly where to pause
3. **Terminal + VSCode:** When you need to see console output
4. **Chrome DevTools:** Great alternative, works anywhere
5. **Add to Watch:** Track important variables
6. **Conditional breakpoints:** For loops and repeated code

### Common Pattern:

```typescript
// Add debugger statements
debugger;
const result = await someFunction()
debugger;

// Run with inspect
pnpm test:graph:inspect

// Attach from VSCode
// Step through and inspect!
```

Happy debugging! 🐛✨

---

## 📚 Further Reading

- [VSCode Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/javascript/)
- [tsx Documentation](https://github.com/esbuild-kit/tsx)

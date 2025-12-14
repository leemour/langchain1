# Debugging Guide

## 🐛 VSCode Debugging (Recommended)

### Quick Start
1. **Open a file** (e.g., `scripts/test-graph.ts`)
2. **Click left of line number** to add a breakpoint (red dot appears)
3. **Press F5** or click "Run and Debug" in sidebar
4. **Select a configuration:**
   - "Debug Current File" - Debugs whatever file is open
   - "Debug Test Graph" - Debugs test-graph.ts
   - "Debug Main App" - Debugs src/index.ts
   - "Debug Ingest" - Debugs ingest script

### What Happens
- Execution pauses at your breakpoints
- You can inspect variables
- Step through code line by line
- See the call stack

### Keyboard Shortcuts
- **F5** - Start debugging
- **F9** - Toggle breakpoint
- **F10** - Step over (next line)
- **F11** - Step into (enter function)
- **Shift+F11** - Step out (exit function)
- **F5** (while debugging) - Continue
- **Shift+F5** - Stop debugging

### Debug Panel Controls
When debugging is active, you'll see these buttons at the top:
- ▶️ Continue (F5)
- ⤵️ Step Over (F10)
- ⬇️ Step Into (F11)
- ⬆️ Step Out (Shift+F11)
- 🔄 Restart
- ⏹️ Stop

## 💻 Terminal Debugging

### Option 1: VSCode + Terminal (Best)

**Start debug server from terminal:**
```bash
pnpm test:graph:debug
```

Output shows:
```
Debugger listening on ws://127.0.0.1:9229/...
```

**Then in VSCode:**
1. Press **Ctrl+Shift+P** (or Cmd+Shift+P on Mac)
2. Type "Debug: Attach to Node Process"
3. Select the process (usually first one)

OR use the "Attach to Process" configuration in the debug panel.

### Option 2: Chrome DevTools

**Start debug server:**
```bash
pnpm test:graph:debug
```

**Open Chrome and go to:**
```
chrome://inspect
```

Click "inspect" under your script. Full Chrome debugger opens!

### Option 3: Node Inspector (Terminal Only)

```bash
node --inspect-brk --enable-source-maps --loader tsx scripts/test-graph.ts
```

Then attach with VSCode or Chrome as above.

## 🎯 Common Debugging Scenarios

### Debug a Specific Script

**Option A: VSCode (Easy)**
1. Open `scripts/test-graph.ts`
2. Add breakpoint (click left of line number)
3. Press F5
4. Choose "Debug Current File"

**Option B: Terminal**
```bash
pnpm test:graph:debug
# Then attach from VSCode or Chrome
```

### Debug With Breakpoints Already Set

**Using `debugger` statement in code:**
```typescript
async function main() {
  console.log('Starting...')
  
  debugger; // Execution will pause here
  
  const result = await graph.invoke({...})
  
  debugger; // And here
  
  console.log(result)
}
```

Then run:
```bash
pnpm test:graph:debug
```

### Debug on Error

**Add try-catch with debugger:**
```typescript
try {
  const result = await graph.invoke({...})
} catch (error) {
  debugger; // Pauses when error occurs
  console.error(error)
  throw error
}
```

### Debug Nodemon (Live Reload)

```bash
pnpm dev:inspect
```

This runs your app with live reload AND debugging enabled!

## 📊 Debug Configurations Explained

### Debug Current File
```json
{
  "name": "Debug Current File",
  "program": "${file}",  // Whatever file is open
  ...
}
```
**Use:** Quick debugging of any script

### Debug Test Graph
```json
{
  "name": "Debug Test Graph",
  "program": "${workspaceFolder}/scripts/test-graph.ts",
  ...
}
```
**Use:** Always debug test-graph.ts regardless of open file

### Attach to Process
```json
{
  "name": "Attach to Process",
  "request": "attach",
  "port": 9229,
  ...
}
```
**Use:** Attach to already-running debug server

## 🔧 Troubleshooting

### "Cannot connect to runtime process"
- Make sure the script is running with `--inspect` flag
- Check port 9229 is free: `lsof -i :9229`

### Breakpoints are gray/hollow
- Source maps might be off
- Try adding `"sourceMaps": true` to launch.json (already there)
- Restart VSCode

### "Program not found"
- Check the path in launch.json
- Make sure file exists
- Use absolute path: `${workspaceFolder}/scripts/test-graph.ts`

### Debugger not pausing at breakpoint
- Make sure breakpoint is in executed code (not in comments)
- Try adding `debugger;` statement in code
- Check "Skip Files" settings - might be skipping your code

### Can't see variable values
- Variables only visible in scope
- Use "Watch" panel to add expressions
- Check "Call Stack" panel to see where you are

## 💡 Pro Tips

### 1. Conditional Breakpoints
Right-click on breakpoint → Edit Breakpoint → Add condition
```typescript
// Only break when i > 5
for (let i = 0; i < 10; i++) {
  doSomething(i)  // Breakpoint here with condition: i > 5
}
```

### 2. Logpoints (Breakpoint that logs instead of pausing)
Right-click on line → Add Logpoint
```
Logpoint: Question: {question}, Docs: {documents.length}
```

### 3. Watch Expressions
Add to "Watch" panel:
- `state.documents.length`
- `JSON.stringify(result, null, 2)`
- `chunks.map(c => c.metadata.source)`

### 4. Debug Console
While paused, type in Debug Console:
```javascript
console.log(state)
state.documents.length
JSON.stringify(result, null, 2)
```

### 5. Skip Node Internals
Already configured in launch.json:
```json
"skipFiles": [
  "<node_internals>/**"
]
```

Add more patterns to skip:
```json
"skipFiles": [
  "<node_internals>/**",
  "**/node_modules/@langchain/**"  // Skip LangChain internals
]
```

## 🚀 Quick Reference

| Task | VSCode | Terminal |
|------|--------|----------|
| Debug current file | F5 → "Debug Current File" | - |
| Debug test-graph | F5 → "Debug Test Graph" | `pnpm test:graph:debug` |
| Debug main app | F5 → "Debug Main App" | `pnpm dev:inspect` |
| Add breakpoint | Click left of line number | Add `debugger;` in code |
| Step through | F10 (over), F11 (into) | Same in Chrome DevTools |
| Inspect variables | Hover or Watch panel | Same in Chrome DevTools |
| Continue | F5 | Same |
| Stop | Shift+F5 | Ctrl+C |

## 📚 Further Reading

- [VSCode Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/javascript/)

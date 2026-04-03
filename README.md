# dev-toolbox

Simple developer tools. One folder per tool. Zero dependencies. Just run.

## Tools

| Tool | What it does |
|------|-------------|
| [firebase-calculator](./firebase-calculator/) | Enter your DAU, get a full breakdown of every Firebase service — usage, limits, and costs |

## Philosophy

- **One folder, one tool.** Each tool is self-contained.
- **Zero dependencies.** Nothing to install. Just `node` (or the relevant runtime).
- **Solves one thing well.** No Swiss Army knives. If it needs a README longer than a screen, it's too complex.

## Usage

```bash
git clone https://github.com/YOUR_USERNAME/dev-toolbox.git
cd dev-toolbox

# Run any tool directly
node firebase-calculator/index.js 500
```

## Contributing

Want to add a tool? Keep it simple:

1. Create a folder with a clear name
2. Add your script + a `README.md` explaining what it does
3. No `package.json`, no `node_modules`, no build step
4. Update this README's tool table

## License

MIT

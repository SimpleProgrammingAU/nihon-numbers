# Contributing to nihon-numbers

Thanks for helping out. Bug reports, fixes and improvements are all welcome.

## Reporting bugs

[Open an issue](https://github.com/SimpleProgrammingAU/nihon-numbers/issues) with the input you passed, the result you got and the result you expected.

## Setting up

You need Node.js 24, the version in `.nvmrc` (`nvm use` picks it up). CI also tests Node.js 22 and 26.

```sh
git clone https://github.com/SimpleProgrammingAU/nihon-numbers.git
cd nihon-numbers
npm ci
```

### TypeScript 6 and 7

The project uses two versions of TypeScript side by side:

- **TypeScript 7** compiles the code. It's installed as `@typescript/native` and runs as `tsc`. It's the fast native compiler, but it doesn't have a JavaScript API yet.
- **TypeScript 6** provides that API. It's installed as `typescript` (through `@typescript/typescript6`) and runs as `tsc6`. ESLint and your editor's IntelliSense use it, because typescript-eslint supports TypeScript versions below 6.1.

`npm run typecheck` runs both, so code must pass under each.

In VS Code, the workspace settings point IntelliSense at TypeScript 6. Choose **Allow** when VS Code asks to use the workspace version, or run **TypeScript: Select TypeScript Version** and pick **Use Workspace Version**.

Once typescript-eslint supports TypeScript 7, the aliases can be removed and `typescript` can point straight at version 7.

## Scripts

| Script                 | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run build`        | Compiles `src/` into `lib/` with TypeScript 7                       |
| `npm run watch`        | Rebuilds on every change                                            |
| `npm run clean`        | Deletes `lib/`                                                      |
| `npm run typecheck`    | Type-checks with TypeScript 7 and TypeScript 6                      |
| `npm run lint`         | Runs ESLint. `npm run lint:fix` fixes what it can.                  |
| `npm run format`       | Formats every file with Prettier                                    |
| `npm run format:check` | Checks formatting without changing files                            |
| `npm test`             | Builds, then runs the tests with coverage                           |
| `npm run check`        | Runs everything CI runs: format check, lint, typecheck, build, test |

## Code style

- Prettier handles formatting, so there's no need to format by hand. Run `npm run format`, or install the extensions recommended in `.vscode/extensions.json` to format and fix lint problems on save.
- ESLint uses typescript-eslint's strict and stylistic type-checked rules.
- Files use LF line endings. `.gitattributes` and `.editorconfig` take care of this, including on Windows.
- The library must not write to the console. The `no-console` rule enforces this.

## Tests

Tests live next to the code in `src/*.test.ts`. They use Mocha's TDD interface (`suite` and `test`) with Node.js's `assert`, and they run against the compiled code in `lib/`, which is what gets published.

- Every bug fix needs a test that fails without the fix.
- Coverage must stay at 100%. `npm test` fails if it drops.

## Pull requests

1. Create a branch from `master`.
2. Make your change and add tests for it.
3. Run `npm run check`.
4. Open a pull request against `master`. CI runs the same checks on Node.js 22, 24 and 26.

## Releasing

This section is for maintainers. CI uploads releases to npm using [trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored in the repository and every release gets a provenance statement. Releases are [staged](https://docs.npmjs.com/staged-publishing/): CI can't make a version public by itself, and nothing goes live until a maintainer approves it with 2FA.

1. Update the version without tagging: `npm version <x.y.z> --no-git-tag-version`.
2. Commit the change, push it to `master` and wait for CI to pass.
3. Tag the commit and push the tag:

   ```sh
   git tag -a v<x.y.z> -m "v<x.y.z>"
   git push origin v<x.y.z>
   ```

4. CI checks that the tag matches the version in `package.json`, runs the tests and stages the tested build on npm.
5. Approve the staged version in the **Staged Packages** tab on npmjs.com, or with `npm stage approve <stage-id>`. Both ask for 2FA.

The trusted publisher on npmjs.com is tied to `.github/workflows/main.yml`. If you rename that file, update the setting on npm too, or staging will fail. Its allowed actions only need `npm stage publish`; leave `npm publish` and `npm dist-tag` off.

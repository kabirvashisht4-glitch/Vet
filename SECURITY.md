# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for a security problem.

Use GitHub's private reporting instead: open the
[Security tab](https://github.com/kabirvashisht4-glitch/Vet/security) of this
repository and choose **Report a vulnerability**. You'll get a reply as soon as
the maintainer can, and credit in the fix if you want it.

## What counts as a vulnerability

Vet looks at repositories you don't control, so the important rule is:

- **Running a repo's tests runs that repo's code.** That is by design and
  isn't a vulnerability. Pass `--no-tests` to turn it off, and only run tests
  for repos you trust.
- **With `--no-tests`, vet must never run code from the repo it checks.** If
  you find a way to make it do that, for example through a crafted file name,
  link, workflow file or `.md` file, please report it.

Also in scope: vet reading or writing files outside the temporary clone,
leaking a `GITHUB_TOKEN`, or crashes triggered by a hostile repository.

## Supported versions

Only the latest release gets security fixes.

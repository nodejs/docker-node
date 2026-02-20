# Governance

The Node.js Docker image project is governed using an **open maintainer model**.

This repository is no longer operated as a Node.js TSC-chartered working group.
Instead, project decisions are made by maintainers in public, in this repository.

## Guiding principles

- Default to public discussion in issues and pull requests.
- Use [Consensus Seeking](https://en.wikipedia.org/wiki/Consensus_decision-making) for decision making.
- Keep decision records in-repo so contributors can follow context.
- Keep a clear path from contributor → collaborator → maintainer.

## Roles

### Contributors

Anyone who proposes changes, reports issues, reviews code, or helps users.

### Collaborators

Collaborators have write access and help with day-to-day maintenance:

- review and merge pull requests
- triage issues
- help drive technical direction

Collaborators are nominated by maintainers via pull request and added after
consensus.

### Maintainers

Maintainers are responsible for long-term stewardship of the project:

- facilitate consensus and escalate unresolved final decisions to the Node.js TSC
- governance and membership updates
- release/publishing policy and automation oversight
- security and incident handling for this repository

Current maintainers:

- Hans Kristian Flaatten ([starefossen](https://github.com/starefossen))
- Hugues Malphettes ([hmalphettes](https://github.com/hmalphettes))
- Rafael Gonzaga ([rafaelgss](https://github.com/rafaelgss))
- Matteo Collina ([mcollina](https://github.com/mcollina))

## Decision making

### Standard changes (code/docs/automation)

- Pull requests are discussed in public.
- A PR from a non-collaborator can be merged by one collaborator.
- A PR from a collaborator should be approved by another collaborator before
  merge.

### Maintainer-level decisions

For governance, membership, major policy, or contentious technical changes:

1. Open an issue or PR describing the decision and proposed outcome.
2. Allow time for async feedback (normally at least 5 days).
3. If no unresolved objections remain, a maintainer may merge/close with a
   summary.

If a final decision cannot be made using Consensus Seeking, the issue should be
escalated to the Node.js TSC (for example by requesting `tsc-agenda`).

In that case, the Node.js TSC is the final arbiter, consistent with the
[TSC Charter](https://github.com/nodejs/TSC/blob/main/TSC-Charter.md).

## Meetings

The project primarily operates asynchronously in GitHub issues and pull
requests. If maintainers hold synchronous meetings, outcomes should be posted
publicly in this repository.

## Membership changes

Collaborator and maintainer changes are proposed via pull request to `README.md`
and/or this file, with rationale included in the PR description.

Maintainers can also move inactive members to emeritus status through the same
public process.

## Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I
  have the right to submit it under the open source license
  indicated in the file; or

- (b) The contribution is based upon previous work that, to the best
  of my knowledge, is covered under an appropriate open source
  license and I have the right under that license to submit that
  work with modifications, whether created wholly or in part
  by me, under the same open source license (unless I am
  permitted to submit under a different license), as indicated
  in the file; or

- (c) The contribution was provided directly to me by some other
  person who certified (a), (b), or (c) and I have not modified
  it.

- (d) I understand and agree that this project and the contribution
  are public and that a record of the contribution (including all
  personal information I submit with it, including my sign-off) is
  maintained indefinitely and may be redistributed consistent with
  this project or the open source license(s) involved.

## Code of Conduct

The Node.js Code of Conduct applies to this project:
<https://github.com/nodejs/admin/blob/master/CODE_OF_CONDUCT.md>.

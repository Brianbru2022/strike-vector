# Third-party licence review

The generated third-party notice deliberately inventories the complete installed JavaScript dependency tree, which is broader than the code distributed in the Windows executable. It deduplicates every locally available licence/notice text and retains the declared licence identifier and upstream source for packages that do not ship a separate text file.

The current JavaScript report records 26 packages with permissive declarations but no separate licence file in their installed package directory. Most are build-time binaries or transitive build tooling and are not independently distributed in the Windows package. Their names, versions, declared licences and upstream locations remain in `public/legal/THIRD_PARTY_NOTICES.txt` so the absence is visible rather than silently ignored.

The Windows build also compiles a locked Rust/Tauri graph. `public/legal/RUST_THIRD_PARTY_NOTICES.txt` contains 430 registry packages and 93 deduplicated upstream texts. Forty-one crates declare a licence but do not bundle a standalone licence file in the local registry package; these remain visible in `reports/commercial-release/rust-dependency-licences.json` for artefact-level review.

This is an attribution record, not a conclusion that every licence obligation is satisfied. Before the signed Windows artefact is submitted, the release owner must:

1. generate the notice from the exact locked release dependency tree;
2. compare the MSI/portable contents with the JavaScript and Rust dependency inventories;
3. obtain any upstream text required for a component actually redistributed in source or binary form;
4. retain the report alongside the submitted build.

The strict Stage 9 audit rejects unresolved or copyleft declarations and reports missing upstream files as review warnings. It does not turn a package declaration into legal approval.

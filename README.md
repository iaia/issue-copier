# issue-copier

github actions

copy issue to another repository


# Use

```
jobs:
  issue_copy:
    name: Copy issue to dest repository
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Transfer issue
        uses: iaia/issue-copier@v1.2
        with:
          GITHUB_OWNER: 'iaia'
          GITHUB_REPOSITORY: 'issue-copier'
          GITHUB_DEST_REPOSITORY: 'issue-copier-2'
          GITHUB_ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
```

# build

```
$ ./node_modules/.bin/tsc src/main.ts
$ ncc build src/entry_point_for_github_actions.js --license LICENSE
$ ncc build src/entry_point_for_lambda.js --license LICENSE
```

# LICENSE

https://github.com/iaia/issue-copier/blob/main/LICENSE

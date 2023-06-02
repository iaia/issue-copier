# issue-copier

github actions

copy issue to another repository


# Use

```yaml
jobs:
  issue_copy:
    name: Copy issue to dest repository
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Transfer issue
        uses: iaia/issue-copier@v1.X
        with:
          GITHUB_OWNER: 'iaia'
          GITHUB_REPOSITORY: 'issue-copier'
          GITHUB_DEST_REPOSITORY: 'issue-copier-2'
          GITHUB_ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
```

# build

```
$ ./node_modules/.bin/tsc
$ ncc build build/entry_point_for_github_actions.js --license LICENSE -o dist/github
$ ncc build build/entry_point_for_lambda.js --license LICENSE -o dist/lambda 
```

# LICENSE

https://github.com/iaia/issue-copier/blob/main/LICENSE

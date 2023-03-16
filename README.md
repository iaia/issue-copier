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

# LICENSE

https://github.com/iaia/issue-copier/blob/main/LICENSE

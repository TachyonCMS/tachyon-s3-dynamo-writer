# tachyon-s3-dynamo-writer
Uses updating files on S3 as a way to manage data in Dynamo. Providing full auditability.

## Overview

1. The lambda will receive an S3 event.
2. The lambda parses the key in the event.
3. Trim parentPath.
4. Remove pkRoot and store.
5. Determine file type
   1. root (pertains to space)
   2. contentType
   3. entry

### Root files

There will be one item created for each file in the root cms-files directory.
 
 pk: <pkRoot>
 sk: <fileName> (minus extension)

### ContentTypes

 pk: <pkRoot>
 sk: ct#<pathRemainder>

### Entries

 pk: <pkRoot>#<entryId>
 sk: <pathRemainder>
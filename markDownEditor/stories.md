Create an html file called markdown-editor.html.  
Please use classes for the code design.
Use IndexDB for data storage

# Markdown Editor Web App - User Stories

## Core Functionality

### Authoring Markdown
1. As a user, I want to enter markdown content in a text area on the left side of the screen, so that I can write and edit my content.
2. As a user, I want to save my markdown files with custom names, so that I can identify and organize them.
3. As a user, I want to see a live preview of my markdown on the right side of the screen, so that I can see how my content will appear when rendered.
4. As a user, I want my markdown content to be automatically saved to IndexedDB as I type, so that I don't lose my work if my browser crashes.

### File Management
5. As a user, I want to create new markdown files, so that I can start working on new content.
6. As a user, I want to view a list of all my previously saved markdown files, so that I can find and access them later.
7. As a user, I want to load any of my previously saved markdown files, so that I can continue editing them.
8. As a user, I want to delete markdown files I no longer need, so that I can keep my file list organized.
9. As a user, I want to rename existing markdown files, so that I can better organize my content.

## User Interface
10. As a user, I want a responsive Bootstrap layout that works well on both desktop and mobile devices, so that I can access my markdown files from any device.
11. As a user, I want a clear visual separation between the editor and preview panels, so that I can focus on either writing or previewing.
12. As a user, I want a toolbar with common markdown formatting options, so that I can quickly apply formatting without memorizing markdown syntax.

## Data Management
13. As a user, I want my files to be stored locally in IndexedDB, so that I can access them even when offline.
14. As a user, I want the option to export my markdown files, so that I can back them up or use them in other applications.
15. As a user, I want the option to import markdown files from my device, so that I can edit files created elsewhere.

## Error Handling
16. As a user, I want to receive notifications if there are issues saving my files to IndexedDB, so that I can take appropriate action to preserve my work.
17. As a user, I want to be alerted before performing destructive actions like deleting files, so that I don't accidentally lose important content.
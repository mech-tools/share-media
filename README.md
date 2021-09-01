![](https://img.shields.io/badge/Foundry-v0.8.9-informational)
![Latest Release Download Count](https://img.shields.io/github/downloads/DarKDinDoN/share-media/latest/module.zip)

# Share Media
A module to easily share images and videos on a scene or in a popout to all or some players. This module is primarly focused on sharing illustrations (and others) without having to create multiple journal entries.

- Share embedded media in a journal entry
- Share embedded media in an actor sheet
- Share media embedded in an item sheet

This module is inspired by the excellent [Journal-To-Canvas-Slideshow](https://github.com/EvanesceExotica/Journal-To-Canvas-Slideshow) module developed by EvanesceExotica.

# How-to
## 1. Install
Search "Share Media" in the modules installer, or copy paste this link: [https://github.com/DarKDinDoN/share-media/releases/latest/download/module.json](https://github.com/DarKDinDoN/share-media/releases/latest/download/module.json)

## 2. Insert a media using the foundry virtual tabletop text editor
#### a. <u>Images</u>
Simply use the "Insert/edit image" button and don't forget to save.

<img src="./readme-assets/helper1.jpg" height="400">

#### b. <u>Videos</u>

"Share Media" supports mp4 & webm videos. To insert a video in a text editor, click on the "Source code" button and copy/paste the following code:
```
<video width="320" height="240" controls>
  <source src="path/to/your-video.webm" type="video/webm">
</video>
```

<img src="./readme-assets/helper2.jpg" height="300">

Make sure to change the file path and the extension type. Then save.

_Note: videos are automatically played and **muted**._

## 2. Share an image or a video in a popout
Once an image or a video is inserted, hover over the media preview to display two buttons.

<img src="./readme-assets/helper3.jpg" height="400">

Hover over the first button two display two popout options:
- Click on "All players" to share the media to all players
- Click on "Selected" to share the media to some players

<img src="./readme-assets/helper4.jpg" height="250">

## 3. Share an image or a video on a scene
#### a. <u>Bounding tile</u>
To share an image or a video on a scene, you need to create a bounding on the scene. To do this, click on the "Create a bounding tile"

<img src="./readme-assets/helper5.jpg" height="400">

You can create multiple bounding tiles and therefore share multiple medias on the same scene!

#### b. <u>Share</u>
Hover over the second button two display two scene options:
- Click on "Fit" to share and resize the media and make sure it is fully visible
- Click on "Cover" to share and resize the media to cover the entire bounding tile (the media will most likely be cropped)

<img src="./readme-assets/helper6.jpg" height="400">

If multiple bounding tiles are created, clicking the "Fit" or "Cover" buttons will prompt to choose the bounding tile.

<img src="./readme-assets/helper7.jpg" height="225">

#### c. <u>Clear</u>

Click on the "Clear bounding tile" button and select the bounding tile to clear.

<img src="./readme-assets/helper8.jpg" height="275">

## 3. Notes
- Videos are automatically played and muted
- If only one bounding tile is present on the scene the module won't prompt to choose between bounding tiles
- Resize a bounding tile to fit your needs
- When sharing a media the source entity (journal entry, actor or item) will not be shared to the players. Only the media is.
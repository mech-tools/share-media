# Share Media API

## Access
The API methods are accessible through: 
```
window["share-media"].API.some-method()
```

## Popout
```javascript
/**
 * Share a media in a popout to all players
 * @param {string} url url to the media
 * @param {boolean} [loop=false] loop the video (only for videos)
 * @param {boolean} [mute=true] mute the video (only for videos)
 */
static async sharePopoutMediaToAll(url, loop = false, mute = true)
```

```javascript
/**
 * Share a media in a popout to a selection of players
 * @param {string} url url to the media
 * @param {boolean} [loop=false] loop the video (only for videos)
 * @param {boolean} [mute=true] mute the video (only for videos)
 */
static async sharePopoutMediaToSome(url, loop = false, mute = true)
```

## Fullscreen
```javascript
/**
 * Share a media fullscreen to all players
 * @param {string} url url to the media
 * @param {boolean} [loop=false] loop the video (only for videos)
 * @param {boolean} [mute=true] mute the video (only for videos)
 */
static async shareFullscreenMediaToAll(url, loop = false, mute = true)
```

```javascript
/**
 * Share a media fullscreen to a selection of players
 * @param {string} url url to the media
 * @param {boolean} [loop=false] loop the video (only for videos)
 * @param {boolean} [mute=true] mute the video (only for videos)
 */
static async shareFullscreenMediaToSome(url, loop = false, mute = true)
```

## Scene
```javascript
/**
 * Share a media on the current scene with fit mode
 * @param {string} url url to the media
 * @param {boolean} [loop=false] loop the video (only for videos)
 * @param {boolean} [mute=true] mute the video (only for videos)
 */
static async shareSceneMediaFit(url, loop = false, mute = true)
```

```javascript
/**
 * Share a media on the current scene with cover mode
 * @param {string} url url to the media
 * @param {boolean} [loop=false] loop the video (only for videos)
 * @param {boolean} [mute=true] mute the video (only for videos)
 */
static async shareSceneMediaCover(url, loop = false, mute = true)
```
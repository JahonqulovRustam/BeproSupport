import ReactPlayer from 'react-player'

const url1 = "youtube.com/watch?v=dQw4w9WgXcQ"
console.log(ReactPlayer.canPlay(url1))

const url2 = "https://youtube.com/watch?v=dQw4w9WgXcQ"
console.log(ReactPlayer.canPlay(url2))

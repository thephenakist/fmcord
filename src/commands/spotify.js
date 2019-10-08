const Command = require(`../classes/Command`);
const fetchtrack = require(`../util/fetchtrack.js`);

class SpotifyCommand extends Command {

  constructor() {
    super({
      name: `spotify`,
      description: `Gets a link of a song from Spotify. If no song is provided, ` +
      `the bot will try to get your currently played track.`,
      usage: [`spotify <song name>`, `spotify`],
      aliases: [`sp`]
    });
  }

  async run(client, message, args) {
    this.setContext(message);
    try {
      if (args.length > 0) {
        const track = await client.spotify.searchTracks(args.join(` `));
        await message.channel.send(track.tracks.items[0].external_urls.spotify);
      } else {
        const fetchTrack = new fetchtrack(client, message);
        let song = await fetchTrack.getcurrenttrack();
        if (!song) {
          song = await fetchTrack.getlasttrack();
        }
        const track = await client.spotify.searchTracks(`${song.artist[`#text`]} ${song.name}`);
        await message.channel.send(track.tracks.items[0].external_urls.spotify);
      }
      return this.context;
    } catch (e) {
      this.context.stack = e.stack;
      throw this.context;
    }
  }

}

module.exports = SpotifyCommand;
const Command = require(`../classes/Command`);
const FMcordEmbed = require(`../utils/FMcordEmbed`);
const Library = require(`../lib/lastfm/index`);
const List = require(`../classes/List`);
const Spotify = require(`../lib/spotify/index`);

const removeParens = str => str
  .replace(`(`, `%28`)
  .replace(`)`, `%29`)
  .replace(`[`, `%5B`)
  .replace(`]`, `%5D`);

class ImLuckyCommand extends Command {

  constructor() {
    super({
      name: `imlucky`,
      description: `Gets a random song from a random user's top 15 songs.`,
      usage: [`imlucky`],
      aliases: [`i`],
    });
  }

  async run(client, message) {
    this.setContext(message);
    try {
      const { spotify } = client.config;
      if (!spotify || !spotify.id || !spotify.secret) {
        await message.reply(`some of the Spotify API credentials are missing, ` +
        `therefore, this command cannot be used. Please contact the maintainer ` +
        `of this bot.`);
        this.context.reason = `Spotify credentials are missing.`;
        throw this.context;
      }
      const spotlib = new Spotify(spotify.id, spotify.secret);
      const lib = new Library(client.config.lastFM.apikey);
      const Users = client.sequelize.import(`../models/Users.js`);
      const users = await Users.findAll({
        where: {
          discordUserID: message.guild.members.map(x => x.id)
        }
      });
      if (!users.length) {
        await message.reply(`no one is registered to the bot in this server.`);
        this.context.reason = `No users found.`;
        throw this.context;
      }
      const names = new List(...users.map(x => ({
        discord: message.guild.members.get(x.discordUserID).user.username,
        lastFM: x.lastFMUsername
      })));
      const username = names.random;
      const userURL = `https://last.fm/user/${username.lastFM}`;
      console.log(userURL);
      const user = await lib.user.getTopTracks(username.lastFM, `overall`, `15`);
      const tracks = new List(...user.toptracks.track);
      const track = tracks.random;
      const trackInfo = await lib.track.getInfo({
        artist: track.artist.name,
        track: track.name
      });
      const { artist, name, url, album, toptags } = trackInfo.track;
      const embed = new FMcordEmbed(message)
        .setTitle(`Random song from ${username.lastFM} (${username.discord})`)
        .setURL(userURL)
        .addField(`Artist`, `[${artist.name}](${removeParens(artist.url)})`, true)
        .addField(`Track`, `[${name}](${removeParens(url)})`, true);
      if (album) {
        embed.addField(`Album`, `[${album.title}](${removeParens(artist.url)})`, true);
        if (album.image.length > 0) {
          embed.setThumbnail(album.image[1][`#text`]);
        }
      }
      embed.addField(`Listens by ${username.lastFM}`, track.playcount, true);
      if (toptags.tag.length > 0) {
        embed.addField(`Tags`, toptags.tag.map(x => `[${x.name}](${x.url})`).join(` - `), true);
      }
      await message.channel.send(embed);

      const spotify_track = await spotlib.findTrack(`${artist.name} ${name}`);
      try{
        await message.channel.send(spotify_track.tracks.items[0].external_urls.spotify);
        // preview url: spotify_track.tracks.items[0].preview_url;
      } catch (e) {
        await message.channel.send('This track could not be found on Spotify.');
      }
      return this.context;
    } catch (e) {
      this.context.stack = e.stack;
      throw this.context;
    }
  }
}

module.exports = ImLuckyCommand;

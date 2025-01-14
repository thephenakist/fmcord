const Command = require(`../classes/Command`);
const YouTubeRequest = require(`../utils/YouTubeRequest`);
const { fetchtrack } = require(`../utils/fetchtrack`);
const { fetchuser } = require(`../utils/fetchuser`);

class YouTubeCommand extends Command {

  constructor() {
    super({
      name: `youtube`,
      description: `Gets a YouTube link of a searched song or video. If no ` +
      `query is specified, it looks at what you're playing right now.`,
      usage: `youtube <search query>`,
      aliases: [`yt`],
      dmAvailable: true,
    });
  }

  async run(client, message, args) {
    this.setContext(message);
    try {
      const { youtube } = client.config;
      if (!youtube || !youtube.apikey) {
        await message.reply(`this bot is not supplied with a YouTube API key, ` +
        `therefore, this command cannot be executed. Please contact the developer ` +
        `of this bot.`);
        this.context.reason = `No YouTube API key found.`;
        throw this.context;
      }
      const yt = new YouTubeRequest(youtube.apikey);
      const fetchUser = new fetchuser(client, message);
      const fetchTrack = new fetchtrack(client, message);
      let query;
      if (args.length === 0) {
        const user = await fetchUser.username();
        if (!user) {
          await message.reply(client.snippets.noLogin);
          this.context.reason = client.snippets.commonReasons.noLogin;
          throw this.context;
        }
        const data = await fetchTrack.getcurrenttrack();
        if (!data) {
          await message.reply(client.snippets.notPlaying);
          this.context.reason = client.snippets.commonReasons.notPlaying;
          throw this.context;
        }
        query = `${data.artist[`#text`]} ${data.name}`;
      } else {
        query = args.join(` `);
      }
      const result = await yt.search(query);
      const item = result.items[0];
      if (!item) {
        message.reply(`no results found on \`${query}\``);
        this.context.reason = `No results on query ${query} found.`;
        throw this.context;
      }
      const URL = `https://youtu.be/${item.id.videoId}`;
      await message.reply(`result for \`${query}\`: ${URL}`);
      return this.context;
    } catch (e) {
      this.context.stack = e.stack;
      throw this.context;
    }
  }

}

module.exports = YouTubeCommand;

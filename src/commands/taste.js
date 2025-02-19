const Command = require(`../classes/Command`);
const { RichEmbed } = require(`discord.js`);
const Library = require(`../lib/lastfm/index.js`);
const { fetchuser } = require(`../utils/fetchuser`);
const getDiscordUser = require(`../utils/DiscordUserGetter`);

const matchErr = `you can't compare your taste with your taste, ` +
`that's illogical.`;
const matchReason = `Message author was trying to taste himself.`;

const difference = (a, b) => {
  if (a > b) return a - b;
  else return b - a;
};

class TasteCommand extends Command {

  constructor() {
    super({
      name: `taste`,
      description: `Compares artists you and a mentioned user listen to, and ` +
      `amounts of plays you both have.`,
      usage: `taste <user mention>`,
      notes: `This only works in a guild and only if both of the users are ` +
      `registered to the bot.`,
      aliases: [`t`]
    });
  }

  async run(client, message, args) {
    this.setContext(message);
    try {
      const fetchUser = new fetchuser(client, message);
      const lib = new Library(client.config.lastFM.apikey);
      if (!args[0]) {
        await message.reply(`specify a user you want to compare tastes with!`);
        this.context.reason = `No user specified.`;
        throw this.context;
      }
      const author = await fetchUser.username();
      if (!author) {
        await message.reply(client.snippets.noLogin);
        this.context.reason = client.snippets.commonReasons.noLogin;
        throw this.context;
      }
      const discordUser = getDiscordUser(message, args.join(` `));
      if (!discordUser) {
        await message.reply(client.snippets.userNotFound);
        this.context.reason = client.snippets.commonReasons.userNotFound;
        throw this.context;
      } else if (discordUser.id === message.author.id) {
        await message.reply(matchErr);
        this.context.reason = matchReason;
        throw this.context;
      }
      const userID = discordUser.id;
      const user = await fetchUser.usernameFromId(userID);
      if (!user) {
        if (userID === message.author.id) {
          await message.reply(client.snippets.noLogin);
          this.context.reason = client.snippets.commonReasons.noLogin;
          throw this.context;
        } else {
          await message.reply(client.snippets.userNoLogin);
          this.context.reason = client.snippets.commonReasons.userNoLogin;
          throw this.context;
        }
      }
      const authorData = await lib.user.getTopArtists(author, `overall`, `150`);
      const userData = await lib.user.getTopArtists(user, `overall`, `150`);
      const matches = [];
      for (const a of userData.topartists.artist) {
        const match = authorData.topartists.artist.find(x => x.name === a.name);
        if (match) {
          const playcounts = [parseInt(match.playcount), parseInt(a.playcount)];
          const diff = difference(...playcounts);
          const data = {
            name: match.name,
            authorPlays: match.playcount,
            userPlays: a.playcount,
            difference: diff,
          };
          if (matches.length !== 10) matches.push(data);
          else break;
        }
      }
      if (matches.length === 0) {
        await message.reply(`you and ${user} share no common artists.`);
        this.context.reason = `No common artists found.`;
        throw this.context;
      }
      matches.sort((a, b) => a.difference - b.difference);
      const embed = new RichEmbed()
        .setColor(message.member.displayColor)
        .setTitle(`${author} and ${user} taste comparison`)
        .setThumbnail(message.author.avatarURL)
        .setTimestamp()
        .setFooter(`Command invoked by ${message.author.tag}`);
      matches.forEach(m => {
        const comp = `${m.authorPlays} plays - ${m.userPlays} plays`;
        embed.addField(`${m.name}`, comp, true);
      });
      await message.channel.send({ embed });
      return this.context;
    } catch (e) {
      this.context.stack = e.stack;
      throw this.context;
    }
  }

}

module.exports = TasteCommand;

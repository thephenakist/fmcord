const { Op } = require(`sequelize`);
module.exports = async (client, message) => {
  const Prefixes = client.sequelize.import(`../models/Prefixes.js`);
  if (message.author.bot) {
    return;
  } else {
    if (message.guild) {
      const hasPrefix = await Prefixes.findOne({
        where: {
          guildID: message.guild.id
        }
      });
      if (message.content.startsWith(client.config.prefix)) {
        client.prefix = client.config.prefix;
      } else if (hasPrefix && message.content.startsWith(hasPrefix.prefix)) {
        client.prefix = hasPrefix.prefix;
      } else {
        const mention = message.mentions.users.first();
        if (mention && mention.id === client.user.id) {
          const prefix = hasPrefix ? hasPrefix.prefix : client.config.prefix;
          return message.reply(`my prefix in this server is \`${prefix}\`. ` + 
          `Do \`${prefix}help\` to find out more about my functionality.`);
        } else {
          return;
        } 
      }
    } else {
      client.prefix = client.config.prefix;
    }
  }
  try {
    const Disables = client.sequelize.import(`../models/Disables.js`);
    const args = message.content.slice(client.prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();
    const Command = client.commands.find(Com => {
      const com = new Com();
      return com.name === commandName || (com.aliases && com.aliases.includes(commandName));
    });
    if (!Command) {
      return;
    }
    const command = new Command();
    const isDisabled = message.guild ? await Disables.findOne({
      where: {
        discordID: {
          [Op.or]: [message.guild.id, message.channel.id]
        },
        cmdName: command.name
      }
    }) : null;
    if (!command.dmAvailable && !message.guild) {
      return message.reply(`I cannot run command \`${command.name}\` inside ` +
      `a DM channel.`);
    } else if (message.guild && !message.guild.me.hasPermission(
      command.permissions.bot, false, true, true
    )) {
      return message.reply(`I do not have a permission \`${command.permissions.bot}\` `+
      `to run a command \`${command.name}\`.`);
    } else if (message.guild && !message.member.hasPermission(
      command.permissions.user, false, true, true
    )) {
      return message.reply(`you do not have a permission ` +
      `\`${command.permissions.user}\` to run command \`${command.name}\`.`);
    } else if (command.botOwnerOnly && message.author.id !== client.config.botOwnerID) {
      return;
    } else if (command.cooldown) {
      const isCooled = client.cooldowns.find(x => {
        return x.name === command.name &&
        x.userID === message.author.id;
      });
      if (isCooled) {
        return message.reply(`command \`${command.name}\` is on a cooldown. ` +
        `Please wait ${Math.floor((isCooled.uncooledAt - Date.now()) / 1000)} ` +
        `seconds before you can use the command.`);
      }
    } 
    if (client.executing.has(message.author.id)) {
      return message.reply(`you are already executing a command! Please wait until ` + 
      `your command is executed.`);
    }
    if (isDisabled) {
      if (isDisabled.discordID === message.guild.id) {
        return message.reply(`command \`${command.name}\` is disabled in ` +
        `${message.guild.name}.`);
      } else {
        return message.reply(`command \`${command.name}\` is disabled in ` +
        `this channel.`);
      }
    }
    client.executing.add(message.author.id);
    const ctx = await command.run(client, message, args);
    client.executing.delete(message.author.id);
    let log = `Command ${ctx.name} executed!\n` +
    `Message content: ${ctx.message.content} (${ctx.message.id})\n` +
    `Executor: ${ctx.author.tag} (${ctx.author.id})\n`;
    if (ctx.channel.name) {
      log += `Channel of execution: ${ctx.channel.name} (${ctx.channel.id})\n`;
    } else {
      log += `Channel of execution: ${ctx.channel.id}\n`;
    }
    if (ctx.guild) {
      log += `Guild of execution: ${ctx.guild.name} (${ctx.guild.id})\n`;
    }
    log += `Timestamp: ${ctx.timestamp}\n`;
    console.log(log);
    if (command.cooldown) {
      client.cooldowns.push({
        name: command.name,
        userID: message.author.id,
        uncooledAt: Date.now() + command.cooldown,
      });
      setTimeout(() => {
        client.cooldowns = client.cooldowns.filter(x => {
          x.name !== command.name && x.userID === message.author.id;
        });
      }, command.cooldown);
    }
  } catch (e) {
    client.executing.delete(message.author.id);
    if (e.isContext) {
      let log = `Command ${e.name} failed to execute!\n` +
      `Message content: ${e.message.content} (${e.message.id})\n` +
      `Executor: ${e.author.tag} (${e.author.id})\n`;
      if (e.channel.name) {
        log += `Channel of execution: ${e.channel.name} (${e.channel.id})\n`;
      } else {
        log += `Channel of execution: ${e.channel.id}\n`;
      }
      if (e.guild) {
        log += `Guild of execution: ${e.guild.name} (${e.guild.id})\n`;
      }
      log += `Timestamp: ${e.timestamp}\n`;
      if (e.reason) {
        log += `Reason: ${e.reason}\n`;
      }
      if (e.stack) {
        log += `Stack: ${e.stack}\n`;
        //if (e.stack.split(` `)[-1] === `500`){
        //  await message.channel.send(`Last.fm's servers are having issues. Please try again later.`);
        //}
        await message.channel.send(client.snippets.error);
      }
      console.error(log);
    } else {
      console.error(e);
    }
  }
};

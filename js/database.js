/* jshint esversion: 6, maxerr: 1000, node: true */
// this is the main database connector used by the app
// storage model is a persistent NeDB

// libraries
const Parser = require('../parser/parser.js');
const fs = require('fs');

// databases are loaded from the specified folder when the database object is created
var Datastore = require('nedb');

class Database {
  constructor(databasePath) {
    this._path = databasePath;

    // open the databases
    this._db = {};
    this._db.matches = new Datastore({ filename: this._path + '/matches.db', autoload: true });
    this._db.heroData = new Datastore({ filename: this._path + '/hero.db', autoload: true });
    this._db.players = new Datastore({ filename: this._path + '/players.db', autoload: true });
    this._db.settings = new Datastore({ filename: this._path + '/settings.db', autoload: true });

    this._db.matches.ensureIndex({ fieldName: 'map' });
    this._db.players.ensureIndex({ fieldName: 'hero' });
  }

  // this should have a GUI warning, this code sure won't stop you.
  deleteDB() {
    fs.unlinkSync(this._path + '/matches.db');
    fs.unlinkSync(this._path + '/hero.db');
    fs.unlinkSync(this._path + '/players.db');
    fs.unlinkSync(this._path + '/settings.db');

    delete this._db;
  }

  addReplayToDatabase(file, opts = {}) {
    var data = Parser.processReplay(file, opts);

    if (data.status === Parser.ReplayStatus.OK) {
      // insert match, upsert is used just in case duplicates exist
      this.insertReplay(data.match, data.players);
    }
  }

  insertReplay(match, players) {
    var self = this;

    this._db.matches.update({ 'map' : match.map, 'date' : match.date, 'loopLength' : match.loopLength }, match, {upsert: true}, function (err, numReplaced, newDoc) {
      if (!newDoc) {
        console.log("Duplicate match found, skipping player update");
      }
      else {
        console.log("Inserted new match " + newDoc._id);

        // update and insert players
        for (var i in players) {
          players[i].matchID = newDoc._id;
          self._db.heroData.insert(players[i]);

          // log unique players in the player database
          var playerDbEntry = {};
          playerDbEntry._id = players[i].ToonHandle;
          playerDbEntry.name = players[i].name;
          playerDbEntry.uuid = players[i].uuid;
          playerDbEntry.region = players[i].region;
          playerDbEntry.realm = players[i].realm;

          var updateEntry = { $set: playerDbEntry, $inc: { matches: 1}};

          self._db.players.update({ _id: playerDbEntry._id }, updateEntry, {upsert: true}, function(err, numReplaced, upsert) {
            if (err)
              console.log(err);
          });
        }
      }
    });
  }

  checkDuplicate(file, callback) {
    let data = Parser.parse(file, [Parser.ReplayDataType.header, Parser.ReplayDataType.details]);
    let search = {};
    search.type = data.header[0].m_type;
    search.loopLength = data.header[0].m_elapsedGameLoops;
    search.map = data.details[0].m_title;
    search.rawDate = data.details[0].m_timeUTC;

    this._db.matches.find(search, function(err, docs) {
      callback(docs.length > 0);
    });
  }

  // counts the given matches
  countMatches(query, callback) {
    this._db.matches.count(query, callback);
  }

  // retrieves a match from the database using the given query
  getMatches(query, callback, opts = {}) {
    if ('sort' in opts) {
      let cursor;
      if ('projection' in opts)
        cursor = this._db.matches.find(query, opts.projection);
      else
        cursor = this._db.matches.find(query);
      
      cursor.sort(opts.sort).exec(callback);
    }
    else {
      if ('projection' in opts) {
        this._db.matches.find(query, opts.projection, callback);
      }
      else {
        this._db.matches.find(query, callback);
      }
    }
  }

  // retrieves matches by id
  getMatchesByID(ids, callback, opts = {}) {
    let query = {$or: []};
    for (let i in ids) {
      query.$or.push({_id: ids[i]});
    }

    this.getMatches(query, callback, opts);
  }

  getHeroDataForID(matchID, callback) {
    let query = {matchID: matchID};
    this._db.heroData.find(query, callback);
  }

  // returns all hero data entries for the given player id
  getHeroDataForPlayer(playerID, callback) {
    let query = {ToonHandle: playerID};
    this._db.heroData.find(query, callback);
  }

  getHeroDataForPlayerWithFilter(playerID, filter, callback) {
    let query = Object.assign({}, filter);
    query.ToonHandle = playerID;
    this._db.heroData.find(query, callback);
  }

  getHeroData(query, callback) {
    this._db.heroData.find(query, callback);
  }

  getPlayers(query, callback, opts = {}) {
    if ('sort' in opts) {
      let cursor;
      if ('projection' in opts)
        cursor = this._db.players.find(query, opts.projection);
      else
        cursor = this._db.players.find(query);
      
      cursor.sort(opts.sort).exec(callback);
    }
    else {
      if ('projection' in opts) {
        this._db.players.find(query, opts.projection, callback);
      }
      else {
        this._db.players.find(query, callback);
      }
    }
  }

  // gets a single player from the players table
  getPlayer(id, callback) {
    this.getPlayers({_id: id}, callback);
  }

  // this will go an process a set of heroData into a set of stats divided
  // by hero, and by map
  summarizeHeroData(docs) {
    // collect data
    // hero averages
    let playerDetailStats = {};
    playerDetailStats.heroes = {};
    playerDetailStats.maps = {};
    playerDetailStats.rawDocs = docs;
    playerDetailStats.games = 0;
    playerDetailStats.wins = 0;
    playerDetailStats.nonCustomGames = 0;
    playerDetailStats.withPlayer = {};
    playerDetailStats.withHero = {};
    playerDetailStats.againstPlayer = {};
    playerDetailStats.againstHero = {};
    playerDetailStats.deathHistogram = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    playerDetailStats.takedownHistogram = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    playerDetailStats.skins = {};
    playerDetailStats.awards = {};
    playerDetailStats.taunts = { 
      bsteps: { count: 0, duration: 0, takedowns: 0, deaths: 0 },
      dances: { count: 0, takedowns: 0, deaths: 0 },
      sprays: { count: 0, takedowns: 0, deaths: 0},
      taunts: { count: 0, takedowns: 0, deaths: 0},
      voiceLines: { count: 0, takedowns: 0, deaths: 0 }
    };

    for (let i = 0; i < docs.length; i++) {
      let match = docs[i];
      let statList = DetailStatList.concat(PerMapStatList[match.map]);

      // hero stuff
      if (!(match.hero in playerDetailStats.heroes)) {
        playerDetailStats.heroes[match.hero] = { games: 0, wins: 0, totalAwards: 0, stats: {}, awards: {} };
      }

      playerDetailStats.games += 1;
      playerDetailStats.heroes[match.hero].games += 1;

      if (!(match.map in playerDetailStats.maps))
        playerDetailStats.maps[match.map] = { games: 0, wins: 0 };

      playerDetailStats.maps[match.map].games += 1;

      for (let s in statList) {
        let statName = statList[s];
        if (!(statName in playerDetailStats.heroes[match.hero].stats))
          playerDetailStats.heroes[match.hero].stats[statName] = 0;
        
        playerDetailStats.heroes[match.hero].stats[statName] += match.gameStats[statName];
      }

      // you only ever get 1 but just in case...
      // ALSO custom games don't get counted here since you can't get awards
      if (match.mode !== ReplayTypes.GameMode.Custom) {
        playerDetailStats.nonCustomGames += 1;
        if ('awards' in match.gameStats) {
          for (let a in match.gameStats.awards) {
            let awardName = match.gameStats.awards[a];
            if (!(awardName in playerDetailStats.heroes[match.hero].awards))
              playerDetailStats.heroes[match.hero].awards[awardName] = 0;
            
            if (!(awardName in playerDetailStats.awards))
              playerDetailStats.awards[awardName] = 0;

            playerDetailStats.awards[awardName] += 1;
            playerDetailStats.heroes[match.hero].awards[awardName] += 1;
            playerDetailStats.heroes[match.hero].totalAwards += 1;
          }
        }
      }

      // with and against stats
      for (let j = 0; j < match.against.ids.length; j++) {
        if (match.with.ids[j] !== match.ToonHandle) {
          if (!(match.with.ids[j] in playerDetailStats.withPlayer)) {
            playerDetailStats.withPlayer[match.with.ids[j]] = { id: match.with.ids[j], name: match.with.names[j], games: 0, wins: 0 };
          }
          if (!(match.with.heroes[j] in playerDetailStats.withHero)) {
            playerDetailStats.withHero[match.with.heroes[j]] = { name: match.with.heroes[j], games: 0, wins: 0 };
          }

          playerDetailStats.withPlayer[match.with.ids[j]].games += 1;
          playerDetailStats.withHero[match.with.heroes[j]].games += 1;

          if (match.win) {
            playerDetailStats.withPlayer[match.with.ids[j]].wins += 1;
            playerDetailStats.withHero[match.with.heroes[j]].wins += 1;
          }
        }

        if (!(match.against.ids[j] in playerDetailStats.againstPlayer)) {
          playerDetailStats.againstPlayer[match.against.ids[j]] = { id: match.against.ids[j], name: match.against.names[j], games: 0, defeated: 0 };
        }
        if (!(match.against.heroes[j] in playerDetailStats.againstHero)) {
          playerDetailStats.againstHero[match.against.heroes[j]] = { name: match.against.heroes[j], games: 0, defeated: 0 };
        }

        playerDetailStats.againstPlayer[match.against.ids[j]].games += 1;
        playerDetailStats.againstHero[match.against.heroes[j]].games += 1;

        if (match.win) {
          playerDetailStats.againstPlayer[match.against.ids[j]].defeated += 1;
          playerDetailStats.againstHero[match.against.heroes[j]].defeated += 1;
        }
      }

      // taunts
      for (let t in playerDetailStats.taunts) {
        let bm = match[t];

        for (let j = 0; j < bm.length; j++) {
          playerDetailStats.taunts[t].count += 1;
          playerDetailStats.taunts[t].takedowns += bm[j].kills;
          playerDetailStats.taunts[t].deaths += bm[j].deaths;

          if ('duration' in bm[j]) {
            playerDetailStats.taunts[t].duration += bm[j].duration;
          }
        }
      }

      // takedowns
      for (let j = 0; j < match.takedowns.length; j++) {
        playerDetailStats.takedownHistogram[match.takedowns[j].killers.length] += 1;
      }

      for (let j = 0; j < match.deaths.length; j++) {
        playerDetailStats.deathHistogram[match.deaths[j].killers.length] += 1;
      }

      // skins
      if (!(match.skin in playerDetailStats.skins))
        playerDetailStats.skins[match.skin] = { games: 0, wins: 0};
      
      playerDetailStats.skins[match.skin].games += 1;

      if (match.win) {
        playerDetailStats.wins += 1;
        playerDetailStats.maps[match.map].wins += 1;
        playerDetailStats.heroes[match.hero].wins += 1;
        playerDetailStats.skins[match.skin].wins += 1;
      }
    }

    // averages
    playerDetailStats.averages = {};
    playerDetailStats.totalTD = 0;
    playerDetailStats.totalDeaths = 0;
    playerDetailStats.totalMVP = 0;
    playerDetailStats.totalAward = 0;

    for (let h in playerDetailStats.heroes) {
      playerDetailStats.averages[h] = {};
      for (let s in playerDetailStats.heroes[h].stats) {
        playerDetailStats.averages[h][s] = playerDetailStats.heroes[h].stats[s] / playerDetailStats.heroes[h].games;
      }
      playerDetailStats.heroes[h].stats.totalKDA = playerDetailStats.heroes[h].stats.Takedowns / Math.max(playerDetailStats.heroes[h].stats.Deaths, 1);

      if ('EndOfMatchAwardMVPBoolean' in playerDetailStats.heroes[h].awards) {
        playerDetailStats.heroes[h].stats.MVPPct = playerDetailStats.heroes[h].awards.EndOfMatchAwardMVPBoolean / playerDetailStats.heroes[h].games;
        playerDetailStats.totalMVP += playerDetailStats.heroes[h].awards.EndOfMatchAwardMVPBoolean;
      }
      else {
        playerDetailStats.heroes[h].stats.MVPPct = 0;
      }

      playerDetailStats.heroes[h].stats.AwardPct = playerDetailStats.heroes[h].totalAwards / playerDetailStats.heroes[h].games;
      playerDetailStats.totalAward += playerDetailStats.heroes[h].totalAwards;
      playerDetailStats.totalDeaths += playerDetailStats.heroes[h].stats.Deaths;
      playerDetailStats.totalTD += playerDetailStats.heroes[h].stats.Takedowns;
    }

    return playerDetailStats;
  }

  // this is intended to be used with only one hero but can be used with multiple (?)
  summarizeTalentData(docs) {
    let talentStats = {};

    for (let d in docs) {
      let match = docs[d];

      if (!(match.hero in talentStats)) {
        talentStats[match.hero] = {};
      }

      for (let t in match.talents) {
        if (!(t in talentStats[match.hero])) {
          talentStats[match.hero][t] = {};
        }

        if (!(match.talents[t] in talentStats[match.hero][t])) {
          talentStats[match.hero][t][match.talents[t]] = { games: 0, wins: 0};
        }

        talentStats[match.hero][t][match.talents[t]].games += 1;
        
        if (match.win) {
          talentStats[match.hero][t][match.talents[t]].wins += 1;
        }
      }
    }

    return talentStats;
  }

  // this returns an object containing hero name and various pick
  // and win stats for the given collection of matches
  // need a heroes talents instance to process the bans
  summarizeMatchData(docs, HeroesTalents) {
    let data = {};
    data.totalMatches = docs.length;
    data.totalBans = 0;
    for (let match of docs) {
      let winner = match.winner;

      for (let t in [0, 1]) {
        let teamHeroes = match.teams[t].heroes;

        for (let h in teamHeroes) {
          let hero = teamHeroes[h];

          if (!(hero in data)) {
            data[hero] = { wins: 0, bans: 0, games: 0, involved: 0 };
          }

          data[hero].games += 1;
          data[hero].involved += 1;
          if (parseInt(t) === winner) {
            data[hero].wins += 1;
          }
        }        
      }

      for (let t in match.bans) {
        for (let b in match.bans[t]) {
          try {
            // typically this means they didn't ban
            if (match.bans[t][b].hero === '') {
              continue;
            }

            let hero = HeroesTalents.heroNameFromAttr(match.bans[t][b].hero);

            if (!(hero in data)) {
              data[hero] = { wins: 0, bans: 0, games: 0, involved: 0 };
            }

            data[hero].involved += 1;
            data[hero].bans += 1;
            data.totalBans += 1;
          }
          catch (e) {
            console.log(e);
          }
        }
      }
    }

    return data;
  }

  // returns a list of versions in the database along with
  // a formatted string for each of them.
  getVersions(callback) {
    this._db.matches.find({}, {version: 1}, function(err, docs) {
      let versions = {}

      for (let doc of docs) {
        versions[doc.version.m_build] = doc.version.m_major + '.' + doc.version.m_minor + '.' + doc.version.m_revision + ' (build ' + doc.version.m_build + ')';
      }

      callback(versions);
    });
  }
}

exports.HeroesDatabase = Database;
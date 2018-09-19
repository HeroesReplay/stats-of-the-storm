const STANDARD_SEGMENT_HEIGHT = 480;
const TALL_SEGMENT_HEIGHT = 560;
const STANDARD_SEGMENT_WITH_SEARCH = STANDARD_SEGMENT_HEIGHT - 50;
const STANDARD_SEGMENT_ALL = STANDARD_SEGMENT_HEIGHT - 100;

class Table {
  constructor(id, opts) {
    this.id = id;
    this.table = $(id);

    // immediately construct table
    this.table.DataTable(opts);
  }

  setData(data) {
    this.clear();
    this.table.DataTable().rows.add(data);
    this.draw();
  }

  // if the data is coming in as an object not an array
  setDataFromObject(data) {
    let dataArr = [];
    for (var key in data) {
      data[key].key = key;
      dataArr.push(data[key]);
    }

    this.setData(dataArr);
  }

  clear() {
    this.table.DataTable().clear();
  }

  draw() {
    this.table.DataTable().draw();
  }

  addRow(data) {
    this.table.DataTable().row.add(data);
  }

  // mostly for the min matches field in player for now
  filterByMinGames(threshold) {
    this.table.DataTable().rows(function(idx, data, node) {
      return data.games < threshold;
    }).remove().draw();
  }

  insertButtons() {
    this.table.DataTable().buttons().container().appendTo($('div.eight.column:eq(0)', this.table.DataTable().table().container()));
  }
}

function preprocessAwards(data) {
  let awardsData = [];
  for (let award in data.awards) {
    awardsData.push({
      key: award,
      games: data.games,
      wins: data.awards[award]
    });
  }

  return awardsData;
}

function playerVsWinPctData(row) {
  if (row.wins)
    return row.wins / row.games;
  else if (row.defeated)
    return row.defeated / row.games;

  return 0;
}

function heroImage(name) {
  return `assets/heroes-talents/images/heroes/${Heroes.heroIcon(name)}`;
}

function heroHeader(heroName, minWidth) {
  let widthStyle = minWidth ? ` style="width: ${minWidth};"` : '';

  return `
    <h3 class="ui image inverted header"${widthStyle}>
      <img src="${heroImage(heroName)}" class="ui rounded image">
      <div class="content">
        ${heroName}
      </div>
    </h3>
  `;
}

function awardHeader(awardKey) {
  let awardData = Heroes.awardInfo(awardKey);
  return `
    <h3 class="ui image inverted header">
      <img src="assets/images/${awardData.image}" class="ui rounded small image">
      <div class="content">
        ${awardData.name}
        <div class="sub header">${awardData.subtitle}</div>
      </div>
    </h3>
  `;
}

function deltaPctRender(data) {
  let pct = `${data > 0 ? '+' : ''}${formatStat('pct', data)}`;
  return `<span class="${(data === 0) ? '' : ((data > 0) ? 'plus' : 'minus')}">${pct}</span>`;
}

const PlayerVsTableFormat = {
  columns: [
    {
      title: 'Hero',
      data: 'name',
      render: heroHeader
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'games'
    }
  ],
  order: [[2, 'desc'], [1, 'desc']],
  paging: false,
  searching: false,
  scrollY: STANDARD_SEGMENT_HEIGHT,
  info: false
};

const PlayerVsPlayerFormat = {
  columns: [
    {
      title: 'Player',
      data: 'name'
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'games'
    }
  ],
  order: [[2, 'desc'], [1, 'desc']],
  paging: true,
  pageLength: 50,
  searching: true,
  info: true,
  scrollY: STANDARD_SEGMENT_ALL
};

const SkinFormat = {
  columns: [
    {
      title: 'Skin ID',
      data: 'key',
      width: '50%'
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data),
      width: '25%'
    },
    {
      title: 'Games',
      data: 'games',
      width: '25%'
    }
  ],
  order: [[1, 'desc'], [2, 'desc']],
  paging: true,
  searching: true,
  info: true,
  scrollY: STANDARD_SEGMENT_ALL,
  pageLength: 50
};

const MapFormat = {
  columns: [
    {
      title: 'Map',
      data: 'key'
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'games'
    }
  ],
  order: [[1, 'desc'], [2, 'desc']],
  paging: false,
  info: false,
  scrollY: TALL_SEGMENT_HEIGHT,
  searching: false
};

const AwardFormat = {
  columns: [
    {
      title: 'Award',
      data: 'key',
      render: (data) => awardHeader(data)
    },
    {
      title: 'Award %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'wins'
    }
  ],
  order: [[1, 'desc'], [2, 'desc']],
  paging: false,
  info: false,
  scrollY: STANDARD_SEGMENT_HEIGHT,
  searching: false
};

const PlayerCompareToAvgFormat = {
  columns: [
    {
      title: 'Stat',
      data: 'statName',
      render: (data) => `<h3 class="ui inverted header">${data}</h3>`
    },
    {
      title: 'Player',
      data: 'pDataSort',
      render: (data, type, row) => row.pData
    },
    {
      title: 'Diff',
      data: 'pctDiff',
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Average',
      data: 'cmpDataSort',
      render: (data, type, row) => row.cmpData
    }
  ],
  order: [[0, 'asc']],
  paging: false,
  info: false,
  scrollY: STANDARD_SEGMENT_WITH_SEARCH,
  searching: true
};

const HeroSummaryFormat = {
  columns: [
    {
      title: 'Hero',
      data: 'key',
      render: heroHeader
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'games'
    },
    {
      title: 'KDA',
      data: 'stats.totalKDA',
      render: (data) => formatStat('KDA', data)
    },
    {
      title: 'Takedowns',
      data: 'stats.Takedowns'
    },
    {
      title: 'Kills',
      data: 'stats.SoloKill'
    },
    {
      title: 'Assists',
      data: 'stats.Assists'
    },
    {
      title: 'Deaths',
      data: 'stats.Deaths'
    },
    {
      title: 'MVP %',
      data: 'stats.MVPPct',
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Award %',
      data: 'stats.AwardPct',
      render: (data) => formatStat('pct', data)
    }
  ],
  order: [[1, 'desc'], [2, 'desc']],
  paging: false,
  info: false,
  scrollY: TALL_SEGMENT_HEIGHT,
  searching: false
}

function getHeroStatSafe(target, row) {
  if (target in row) {
    return row[target].toFixed(2);
  }

  return 0;
}

// this one's large, and also can be automated.
function playerDetailStatFormat() {
  let columns = [{
    title: 'Hero',
    data: 'key',
    render: (data) => heroHeader(data, '200px')
  },
  {
    title: 'Games',
    data: 'games'
  }];

  let allStats = DetailStatList;
  for (let m in PerMapStatList) {
    allStats = allStats.concat(PerMapStatList[m]);
  }

  for (let i in allStats) {
    columns.push({
      title: DetailStatString[allStats[i]],
      data: (row) => getHeroStatSafe(allStats[i], row),
      render: (data) => formatStat(allStats[i], data)
    });
  }

  return {
    columns,
    order: [[0, 'asc']],
    paging: false,
    info: false,
    scrollY: 'calc(100vh - 380px)',
    scrollX: true,
    searching: false,
    fixedColumns: true,
    scrollCollapse: true
  };
}

function playerRankingStatFormat() {
  let base = playerDetailStatFormat();
  base.columns[0] = {
    title: 'Player',
    data: 'name',
    render: (data, type, row) => {
      return `<h3 class="ui inverted header player-name link-to-player" player-id="${row.id}">${data}</h4>`
    }
  };
  base.columns.push({
    title: 'Hero Pool',
    data: 'Pool'
  });

  // awards n stuff
  let awardsColumns = [
    {
      title: 'Votes',
      data: 'votes'
    },
    {
      title: 'Awards',
      data: 'totalAwards'
    },
    {
      title: 'Award %',
      data: 'awardPct',
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'MVP',
      data: 'totalMVP'
    },
    {
      title: 'MVP %',
      data: 'MVPPct',
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Bsteps',
      data: 'taunts.bsteps.count'
    },
    {
      title: 'Bstep TD',
      data: 'taunts.bsteps.takedowns'
    },
    {
      title: 'Bstep Deaths',
      data: 'taunts.bsteps.deaths'
    },
    {
      title: 'Taunts',
      data: 'taunts.taunts.count'
    },
    {
      title: 'Taunt TD',
      data: 'taunts.taunts.takedowns'
    },
    {
      title: 'Taunt Deaths',
      data: 'taunts.taunts.deaths'
    },
    {
      title: 'Sprays',
      data: 'taunts.sprays.count'
    },
    {
      title: 'Spray TD',
      data: 'taunts.sprays.takedowns'
    },
    {
      title: 'Spray Deaths',
      data: 'taunts.sprays.deaths'
    },
    {
      title: 'Dances',
      data: 'taunts.dances.count'
    },
    {
      title: 'Dance TD',
      data: 'taunts.dances.takedowns'
    },
    {
      title: 'Dance Deaths',
      data: 'taunts.dances.deaths'
    }
  ];

  base.columns = base.columns.concat(awardsColumns);

  base.order = [[1, 'desc']];
  base.paging = true;
  base.info = true;
  base.searching = true;
  base.scrollCollapse = false;
  base.pageLength = 100;
  base.lengthMenu = [25, 50, 100, 250, 500];
  base.scrollY = 'calc(100vh - 370px)';
  base.buttons = ['csv', 'excel'];

  return base;
}

const TeamHeroSummaryFormat = {
  columns: [
    {
      title: 'Hero',
      data: 'heroName',
      render: heroHeader
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Pick %',
      data: (row) => row.games / row.totalMatches,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'games'
    },
    {
      title: 'TD',
      data: 'stats.Takedowns'
    },
    {
      title: 'D',
      data: 'stats.Deaths'
    },
    {
      title: 'K',
      data: 'stats.SoloKill'
    },
    {
      title: 'KDA',
      data: (row) => row.stats.Takedowns / Math.max(1, row.stats.Deaths),
      render: (data) => formatStat('KDA', data)
    },
    {
      title: 'Avg. Time Dead',
      data: 'TimeSpentDead',
      render: (data) => formatStat('Time', data)
    },
    {
      title: 'Avg. % Dead',
      data: (row) => row.stats.timeDeadPct / row.games,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Round 1 %',
      data: (row) => row.picks.round1.count / row.totalMatches,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Round 2 %',
      data: (row) => row.picks.round2.count / row.totalMatches,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Round 3 %',
      data: (row) => row.picks.round3.count / row.totalMatches,
      render: (data) => formatStat('pct', data)
    }
  ],
  scrollY: STANDARD_SEGMENT_HEIGHT,
  paging: false,
  info: false,
  searching: false,
  order: [[1, 'desc'], [2, 'desc']]
}

const TeamBanSummaryFormat = {
  columns: [
    {
      title: 'Hero',
      data: 'heroName',
      render: heroHeader
    },
    {
      title: 'Ban %',
      data: (row) => row.bans / row.totalMatches,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Bans',
      data: 'bans'
    },
    {
      title: '1st Ban %',
      data: (row) => row.first / row.totalMatches,
      render: (data) => formatStat('pct', data)
    },
    {
      title: '1st Bans',
      data: 'first'
    },
    {
      title: '2nd Ban %',
      data: (row) => row.second / row.totalMatches,
      render: (data) => formatStat('pct', data)
    },
    {
      title: '2nd Bans',
      data: 'second'
    }
  ],
  scrollY: STANDARD_SEGMENT_HEIGHT,
  paging: false,
  info: false,
  searching: false,
  order: [[1, 'desc'], [2, 'desc']]
}

const TeamCompareToAvgFormat = {
  columns: [
    {
      title: 'Stat',
      data: 'statName',
      render: (data) => `<h3 class="ui inverted header">${data}</h3>`
    },
    {
      title: 'Team',
      data: 'pDataSort',
      render: (data, type, row) => row.pData
    },
    {
      title: 'Diff',
      data: 'pctDiff',
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Average',
      data: 'cmpDataSort',
      render: (data, type, row) => row.cmpData
    }
  ],
  order: [[0, 'asc']],
  paging: false,
  info: false,
  scrollY: STANDARD_SEGMENT_WITH_SEARCH,
  searching: true
};

const HeroDetailCompareFormat = {
  columns: [
    {
      title: 'Hero',
      data: 'name',
      render: heroHeader
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'games'
    },
    {
      title: 'Win % Δ',
      data: (row) => playerVsWinPctData(row) - row.avgWinPct,
      render: deltaPctRender
    }
  ],
  order: [[2, 'desc'], [1, 'desc']],
  paging: false,
  searching: false,
  scrollY: STANDARD_SEGMENT_HEIGHT,
  info: false
};

const HeroDetailPlayerFormat = {
  columns: [
    {
      title: 'Player',
      data: 'name'
    },
    {
      title: 'Win %',
      data: playerVsWinPctData,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'games'
    },
    {
      title: 'KDA',
      data: 'totalKDA',
      render: (data) => formatStat('KDA', data)
    },
    {
      title: 'TD',
      data: 'total.Takedowns'
    },
    {
      title: 'K',
      data: 'total.SoloKill'
    },
    {
      title: 'A',
      data: 'total.Assists'
    },
    {
      title: 'D',
      data: 'total.Deaths'
    },
    {
      title: 'Avg. Time Dead %',
      data: 'averages.timeDeadPct',
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Avg. DPM',
      data: 'averages.DPM',
      render: (data) => formatStat('DPM', data, true)
    },
    {
      title: 'Avg. HPM',
      data: 'averages.HPM',
      render: (data) => formatStat('HPM', data, true)
    },
    {
      title: 'Clutch Heals',
      data: 'total.ClutchHealsPerformed'
    }
  ],
  order: [[2, 'desc'], [1, 'desc']],
  paging: true,
  pageLength: 50,
  searching: true,
  info: true,
  scrollY: STANDARD_SEGMENT_ALL
}

// this one sucks a lil, there's no list of team stats and they're all over the place.
const TeamRankingFormat = {
  columns: [
    {
      title: 'Team Name',
      data: 'name',
      width: '300px',
      render: (data, type, row) => `<h3 class="ui inverted header player-name" team-id="${row.id}">${data}</h3>`
    },
    {
      title: 'Win %',
      data: (row) => row.wins / row.totalMatches,
      render: (data) => formatStat('pct', data)
    },
    {
      title: 'Games',
      data: 'totalMatches'
    },
    {
      title: 'KDA',
      data: 'selectedStats.totalKDA',
      render: (data) => formatStat('KDA', data)
    },
    {
      title: 'Takedowns',
      data: 'selectedStats.Takedowns',
      render: (data) => formatStat('Takedowns', data)
    },
    {
      title: 'Deaths',
      data: 'selectedStats.Deaths',
      render: (data) => formatStat('Deaths', data)
    },
    {
      title: 'Hero Pool',
      data: 'heroesPlayed'
    },
    {
      title: 'People Per Kill',
      data: 'selectedStats.PPK',
      render: (data) => formatStat('PPK', data)
    },
    {
      title: 'Time Spent Dead',
      data: 'selectedStats.TimeSpentDead',
      render: (data) => formatStat('TimeSpentDead', data)
    },
    {
      title: '% Time Dead',
      data: 'selectedStats.timeDeadPct',
      render: (data) => formatStat('timeDeadPct', data)
    },
    {
      title: 'Hero Damage',
      data: 'selectedStats.HeroDamage',
      render: (data) => formatStat('HeroDamage', data)
    },
    {
      title: 'Siege Damage',
      data: 'selectedStats.SiegeDamage',
      render: (data) => formatStat('SiegeDamage', data)
    },
    {
      title: 'Minion Damage',
      data: 'selectedStats.MinionDamage',
      render: (data) => formatStat('MinionDamage', data)
    },
    {
      title: 'Creep Damage',
      data: 'selectedStats.CreepDamage',
      render: (data) => formatStat('CreepDamage', data)
    },
    {
      title: 'Damage Taken',
      data: 'selectedStats.DamageTaken',
      render: (data) => formatStat('DamageTaken', data)
    },
    {
      title: 'Healing',
      data: 'selectedStats.Healing',
      render: (data) => formatStat('Healing', data)
    },
    {
      title: 'Self Healing',
      data: 'selectedStats.SelfHealing',
      render: (data) => formatStat('SelfHealing', data)
    },
    {
      title: 'Shielding',
      data: 'selectedStats.ProtectionGivenToAllies',
      render: (data) => formatStat('ProtectionGivenToAllies', data)
    },
    {
      title: 'Team Fight Hero Damage',
      data: 'selectedStats.TeamfightHeroDamage',
      render: (data) => formatStat('TeamfightHeroDamage', data)
    },
    {
      title: 'Team Fight Damage Taken',
      data: 'selectedStats.TeamfightDamageTaken',
      render: (data) => formatStat('TeamfightDamageTaken', data)
    },
    {
      title: 'Teamfight Healing',
      data: 'selectedStats.TeamfightHealingDone',
      render: (data) => formatStat('TeamfightHealingDone', data)
    },
    {
      title: 'CC Time',
      data: 'selectedStats.TimeCCdEnemyHeroes',
      render: (data) => formatStat('TimeCCdEnemyHeroes', data)
    },
    {
      title: 'Root Time',
      data: 'selectedStats.TimeRootingEnemyHeroes',
      render: (data) => formatStat('TimeRootingEnemyHeroes', data)
    },
    {
      title: 'Silence Time',
      data: 'selectedStats.TimeSilencingEnemyHeroes',
      render: (data) => formatStat('TimeSilencingEnemyHeroes', data)
    },
    {
      title: 'Stun Time',
      data: 'selectedStats.TimeStunningEnemyHeroes',
      render: (data) => formatStat('TimeStunningEnemyHeroes', data)
    },
    {
      title: 'Match Length',
      data: 'matchLength.val'
    },
    {
      title: 'Time to Level 10',
      data: 'selectedStats.timeTo10',
      render: (data) => formatStat('timeTo10', data)
    },
    {
      title: 'Games Reached Level 10',
      data: 'level10Games'
    },
    {
      title: 'Time to Level 20',
      data: 'selectedStats.timeTo20',
      render: (data) => formatStat('timeTo20', data)
    },
    {
      title: 'Games Reached Level 20',
      data: 'level20Games'
    },
    {
      title: 'Time @ Level 1',
      data: 'tierTimes.T1.average',
      render: formatSeconds
    },
    {
      title: 'Time @ Level 4',
      data: 'tierTimes.T2.average',
      render: formatSeconds
    },
    {
      title: 'Time @ Level 7',
      data: 'tierTimes.T3.average',
      render: formatSeconds
    },
    {
      title: 'Time @ Level 10',
      data: 'tierTimes.T4.average',
      render: formatSeconds
    },
    {
      title: 'Time @ Level 13',
      data: 'tierTimes.T5.average',
      render: formatSeconds
    },
    {
      title: 'Time @ Level 16',
      data: 'tierTimes.T6.average',
      render: formatSeconds
    },
    {
      title: 'Mercenary Captures',
      data: 'selectedStats.mercCaptures',
      render: (data) => formatStat('mercCaptures', data)
    },
    {
      title: 'Mercenary Uptime',
      data: 'selectedStats.mercUptime',
      render: (data) => formatStat('mercUptime', data)
    },
    {
      title: 'Mercenary Uptime %',
      data: 'selectedStats.mercUptimePercent',
      render: (data) => formatStat('mercUptimePercent', data)
    },
    {
      title: 'Lv Δ',
      data: 'endOfGameLevels.combined.average',
      render: (data) => formatStat('', data, true)
    },
    {
      title: 'Win Lv Δ',
      data: 'endOfGameLevels.win.average',
      render: (data) => formatStat('', data, true)
    },
    {
      title: 'Loss Lv Δ',
      data: 'endOfGameLevels.loss.average',
      render: (data) => formatStat('', data, true)
    },
    {
      title: 'Forts Destroyed',
      data: 'structures.Fort.destroyed',
      render: (data) => formatStat('', data, true)
    },
    {
      title: 'Time to First Fort',
      data: 'structures.Fort.first',
      render: (data) => formatStat('time', data)
    },
    {
      title: 'Forts Lost',
      data: 'structures.Fort.lost',
      render: (data) => formatStat('', data, true)
    },
    {
      title: 'Keeps Destroyed',
      data: 'structures.Keep.destroyed',
      render: (data) => formatStat('', data, true)
    },
    {
      title: 'Time to First Keep',
      data: 'structures.Keep.first',
      render: (data) => formatStat('time', data)
    },
    {
      title: 'Keeps Lost',
      data: 'structures.Keep.lost',
      render: (data) => formatStat('', data, true)
    }
  ],
  order: [[0, 'asc']],
  paging: true,
  info: true,
  searching: true,
  scrollCollapse: false,
  pageLength: 100,
  lengthMenu: [25, 50, 100, 250, 500],
  scrollY: 'calc(100vh - 430px)',
  scrollX: true,
  buttons: ['csv', 'excel'],
  fixedColumns: true
}

exports.Table = Table;
exports.PlayerVsTableFormat = PlayerVsTableFormat;
exports.PlayerVsPlayerFormat = PlayerVsPlayerFormat;
exports.SkinFormat = SkinFormat;
exports.MapFormat = MapFormat;
exports.AwardFormat = AwardFormat;
exports.PlayerCompareToAvgFormat = PlayerCompareToAvgFormat;
exports.HeroSummaryFormat = HeroSummaryFormat;
exports.PlayerDetailStatFormat = playerDetailStatFormat();
exports.TeamHeroSummaryFormat = TeamHeroSummaryFormat;
exports.TeamBanSummaryFormat = TeamBanSummaryFormat;
exports.TeamCompareToAvgFormat = TeamCompareToAvgFormat;
exports.HeroDetailCompareFormat = HeroDetailCompareFormat;
exports.HeroDetailPlayerFormat = HeroDetailPlayerFormat;
exports.PlayerRankingStatFormat = playerRankingStatFormat();
exports.TeamRankingFormat = TeamRankingFormat;
exports.preprocessAwards = preprocessAwards;
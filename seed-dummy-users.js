(function seedDummyUsers() {
  var GAME_ID = 'f1_survivor_2026';
  var PFX = 'collush_';
  var get = function(k) { var v = JSON.parse(localStorage.getItem(PFX+k) || '[]'); return Array.isArray(v) ? v : []; };
  var set = function(k, v) { localStorage.setItem(PFX+k, JSON.stringify(v)); };
  var merge = function(a, b) {
    var m = {};
    [].concat(Array.isArray(a) ? a : []).concat(Array.isArray(b) ? b : []).forEach(function(x) { m[x.id] = Object.assign({}, m[x.id], x); });
    return Object.values(m);
  };
  var USERS = [
    { id: 'sim_user_1', displayName: 'Max Speed',     email: 'maxspeed@collush.sim' },
    { id: 'sim_user_2', displayName: 'Pole Position', email: 'polepos@collush.sim' },
    { id: 'sim_user_3', displayName: 'Pitstop Pete',  email: 'pitstop@collush.sim' },
    { id: 'sim_user_4', displayName: 'DRS Zone',      email: 'drszone@collush.sim' },
    { id: 'sim_user_5', displayName: 'Safety Car',    email: 'safetycar@collush.sim' }
  ];
  var POS = {
    R01: {RUS:1,ANT:2,LEC:3,HAM:4,NOR:5,VER:6,BEA:7,LIN:8,BOR:9,GAS:10,OCO:11,ALB:12,LAW:13,COL:14,SAI:15,PER:16,HAD:20,PIA:20,HUL:20,BOT:20,ALO:20,STR:20},
    R02: {ANT:1,RUS:2,HAM:3,LEC:4,BEA:5,GAS:6,LAW:7,HAD:8,SAI:9,COL:10,HUL:11,LIN:12,BOT:13,OCO:14,PER:15,NOR:20,PIA:20,ALB:20,BOR:20,VER:20,ALO:20,STR:20},
    R03: {ANT:1,PIA:2,LEC:3,RUS:4,NOR:5,HAM:6,GAS:7,VER:8,LAW:9,OCO:10,HUL:11,HAD:12,BOR:13,LIN:14,SAI:15,COL:16,PER:17,ALO:18,BOT:19,ALB:20,BEA:20,STR:20}
  };
  var NAMES = {RUS:'George Russell',ANT:'Kimi Antonelli',LEC:'Charles Leclerc',HAM:'Lewis Hamilton',NOR:'Lando Norris',VER:'Max Verstappen',BEA:'Oliver Bearman',LIN:'Arvid Lindblad',BOR:'Gabriel Bortoleto',GAS:'Pierre Gasly',PIA:'Oscar Piastri',LAW:'Liam Lawson',SAI:'Carlos Sainz',HAD:'Isack Hadjar',HUL:'Nico Hulkenberg',ALB:'Alexander Albon',OCO:'Esteban Ocon',BOT:'Valtteri Bottas',PER:'Sergio Perez',ALO:'Fernando Alonso',STR:'Lance Stroll',COL:'Franco Colapinto'};
  var PLAN = {
    sim_user_1: {R01:{a:'RUS',b:'ANT'},R02:{a:'HAM',b:'LEC'},R03:{a:'ANT',b:'RUS'},R04:{a:'VER',b:'HAM'},R05:{a:'LEC',b:'NOR'},R06:{a:'PIA',b:'VER'},R07:{a:'NOR',b:'BEA'}},
    sim_user_2: {R01:{a:'ANT',b:'BEA'},R02:{a:'RUS',b:'GAS'},R03:{a:'LEC',b:'NOR'},R04:{a:'VER',b:'ANT'},R05:{a:'HAM',b:'RUS'},R06:{a:'PIA',b:'LEC'},R07:{a:'NOR',b:'VER'}},
    sim_user_3: {R01:{a:'NOR',b:'HAM'},R02:{a:'ANT',b:'HAD'},R03:{a:'PIA',b:'LAW'},R04:{a:'RUS',b:'ANT'},R05:{a:'LEC',b:'NOR'},R06:{a:'VER',b:'RUS'},R07:{a:'HAM',b:'LEC'}},
    sim_user_4: {R01:{a:'VER',b:'BOR'},R02:{a:'LEC',b:'NOR'}},
    sim_user_5: {R01:{a:'HAM',b:'GAS'},R02:{a:'ANT',b:'SAI'},R03:{a:'RUS',b:'STR'}}
  };
  var picks = [];
  var stats = {};
  USERS.forEach(function(u) {
    stats[u.id] = { points: 0, status: 'alive', eliminatedAt: null };
    Object.keys(PLAN[u.id]).forEach(function(raceId) {
      var p = PLAN[u.id][raceId];
      var done = !!POS[raceId];
      var posA = done ? POS[raceId][p.a] : null;
      var posB = done ? POS[raceId][p.b] : null;
      var rA = done ? (posA <= 3 ? 'success' : 'fail') : null;
      var rB = done ? (posB <= 10 ? 'success' : 'fail') : null;
      var survived = done ? (rA === 'success' || rB === 'success') : null;
      var point = done ? (rA === 'success' && rB === 'success') : false;
      if (done && survived === false && stats[u.id].status === 'alive') {
        stats[u.id].status = 'eliminated';
        stats[u.id].eliminatedAt = raceId;
      }
      if (point) stats[u.id].points++;
      picks.push({ id: GAME_ID+'_'+u.id+'_'+raceId, gameId: GAME_ID, userId: u.id, raceId: raceId, columnA: {driverId:p.a, driverName:NAMES[p.a]}, columnB: {driverId:p.b, driverName:NAMES[p.b]}, resultA:rA, resultB:rB, survived:survived, pointEarned:point, submittedAt: new Date().toISOString() });
    });
  });
  var players = USERS.map(function(u) {
    var s = stats[u.id];
    var obj = { id: GAME_ID+'_'+u.id, gameId: GAME_ID, userId: u.id, displayName: u.displayName, status: s.status, points: s.points, joinedAt: new Date().toISOString() };
    if (s.eliminatedAt) obj.eliminatedAt = s.eliminatedAt;
    return obj;
  });
  var userProfiles = USERS.map(function(u) { return { id: u.id, uid: u.id, email: u.email, displayName: u.displayName, role: 'player', createdAt: new Date().toISOString() }; });
  var games = get('games');
  if (!games.find(function(g) { return g.id === GAME_ID; })) {
    set('games', games.concat([{ id: GAME_ID, season: 2026, name: 'F1 Survivor 2026', createdBy: 'system', status: 'active', currentRaceIndex: 0, createdAt: new Date().toISOString() }]));
  }
  set('players', merge(get('players'), players));
  set('picks', merge(get('picks'), picks));
  set('users', merge(get('users'), userProfiles));
  console.log('Seed done! Players:', players.map(function(p){return p.displayName+' ('+p.status+', '+p.points+'pts)';}));
})()

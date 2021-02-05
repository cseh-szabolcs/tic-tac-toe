/**
 * Constants for players.
 */
var Players = {
  user: 'X',
  ai: 'O'
};

/**
 * Manages the game-state.
 */
var Game = {
  useAi: true,
  running: false,
  player: null,
  winner: null,
  board: [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ],
  count: 0,
  start: function(firstMove, useAi) {
    this.running = true;
    this.count = 0;
    this.winner = null;
    this.useAi = useAi;
    for (var y = 0; y < 3; y++) {
      for (var x = 0; x < 3; x++) {
        this.board[y][x] = '';
      }
    }
    View.apply('start');
    this.setPlayer(firstMove);
  },
  end: function(result) {
    this.running = false;
    this.player = null;
    this.winner = result.winner;
    View.apply('end', result);
  },
  setPlayer: function(firstMove) {
    this.player = (firstMove || this.player === Players.ai)
      ? Players.user
      : Players.ai;
    Ai.apply('setPlayer');
    View.apply('setPlayer');
  },
  isAiPlayer: function() {
    return (this.player === Players.ai);
  },
  flip: function(point, player) {
    if (player !== this.player) {
      return;
    }
    if (this.board[point.y][point.x]) {
      return;
    }
    this.set(point);
    View.apply('flip', point);
    var result = this.checkWinner();
    if (result) {
      this.end(result);
    } else {
      this.setPlayer();
    }
  },
  set: function(point, player) {
    this.board[point.y][point.x] = (player) ? player : this.player;
    this.count++;
  },
  undo: function(point) {
    this.board[point.y][point.x] = '';
    this.count--;
  },
  checkWinner: function() {
    var i;
    for (i = 0; i < 3; i++) {
      if (this.equals(this.board[i][0], this.board[i][1], this.board[i][2])) {
        return {winner: this.board[i][0], y:i};
      }
    }
    for (i = 0; i < 3; i++) {
      if (this.equals(this.board[0][i], this.board[1][i], this.board[2][i])) {
        return {winner: this.board[0][i], x:i};
      }
    }
    if (this.equals(this.board[0][0], this.board[1][1], this.board[2][2])) {
      return {winner: this.board[0][0], d:0};
    }
    if (this.equals(this.board[0][2], this.board[1][1], this.board[2][0])) {
      return {winner: this.board[0][2], d:1};
    }
    return (this.count === 9)
      ? {winner: false}
      : false;
  },
  equals: function (a, b, c) {
    return (a !== '' && a === b && b === c);
  }
};

/**
 * Representation of the AI.
 */
var Ai = {
  thinkingTime: {
    min: 500,
    max: 1200
  },
  simulateClick: function() {
    window.setTimeout(function() {
      Game.flip(Engine.findBestMove(), Players.ai);
    }, this.rand(this.thinkingTime.min, this.thinkingTime.max));
  },
  rand: function rand(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  apply: function(event) {
    switch (event) {
      case 'setPlayer':
        if (Game.player === Players.ai) {
          this.simulateClick();
        }
    }
  }
};

/**
 * Contains all algorithms which are used by AI.
 */
var Engine = {
  findBestMove: function() {
    if (!Game.useAi) {
      return this.findFreeCell(true);
    }
    
    var self = this;
    var bestMove = null;
    var bestScore = -Infinity;
    
    this.findFreeCell(function(point) {
      Game.set(point, Players.ai);
      var score = self.minimax(false, -Infinity, Infinity);
      Game.undo(point);
      if (score > bestScore) {
        bestScore = score;
        bestMove = point;
      }
    });
    return bestMove;
  },
  findFreeCell: function(mode) {
    var cells = [];
    for (var y = 0; y < Game.board.length; y++) {
      for (var x = 0; x < Game.board[y].length; x++) {
        if (Game.board[y][x] === '') {
          var point = {x:x, y:y};
          cells.push(point);
          if (mode && mode.constructor == Function) {
            var res = mode(point);
            if (res) {
              break;
            }
          }
        }
      }
    }
    if (cells.length) {
      return mode
        ? cells[Ai.rand(0, cells.length-1)]
        : cells[0]
    }
    return null;
  },
  minimax: function(isMaximizing, alpha, beta) {
    var result = Game.checkWinner();
    if (result) {
      switch (result.winner) {
        case Players.ai:
          return 1;
        case Players.user:
          return -1;
        default:
          return 0;
      }
    }
  
    var self = this;
    var bestScore;
    if (isMaximizing) {
      bestScore = -Infinity;
      this.findFreeCell(function(point) {
        Game.set(point, Players.ai);
        var score = self.minimax(false, alpha, beta);
        bestScore = Math.max(score, bestScore);
        alpha = Math.max(alpha, score);
        Game.undo(point);
        if (beta <= alpha) {
          return true
        }
      });
      return bestScore;
    }
    
    bestScore = Infinity;
    this.findFreeCell(function(point) {
      Game.set(point, Players.user);
      var score = self.minimax(true, alpha, beta);
      bestScore = Math.min(score, bestScore);
      beta = Math.min(beta, score);
      Game.undo(point);
      if (beta <= alpha) {
        return true;
      }
    });
    return bestScore;
  }
};

/**
 * View-renderer.
 */
var View = {
  cells: null,
  output: null,
  loading: null,
  controls: null,
  play: null,
  result: null,
  apply: function(event, values) {
    switch (event) {
      case 'start':
        this.controls.style.visibility = 'hidden';
        this.output.style.color = '#b3b3b3';
        this.output.innerText = '';
        this.drawResultLine({});
        this.cells.forEach(function(cell) {
          cell.innerText = '';
          cell.classList.add("active");
        });
        break;
      case 'flip':
        var cell =  this.cells.item(values.y*3+values.x);
        cell.innerText = Game.player;
        cell.classList.remove('active');
        this.loading.style.display = 'none';
        break;
      case 'setPlayer':
        this.loading.style.display = Game.isAiPlayer() ? 'block' : 'none';
        this.output.innerText = Game.isAiPlayer()
          ? 'Computer\'s turn ...'
          : 'Your turn';
        break;
      case 'end':
        this.play.innerText = 'Replay';
        this.controls.style.visibility = 'visible';
        if (Game.winner === false) {
          this.output.innerText = 'Draw!';
        } else {
          this.drawResultLine(values);
          this.output.style.color = (Game.winner === Players.ai) ? 'red' : 'green';
          this.output.innerText = (Game.winner === Players.ai)
            ? 'Computer has won!'
            : 'You have won ;)';
        }
        this.cells.forEach(function(cell) {
          cell.classList.remove("active");
        });
        break;
    }
  },
  drawResultLine: function(data) {
    var t = 0, l = 15, r = 15, v = 'none', d = 0, b = 'white';
    if (data.hasOwnProperty('d')) {
      t = 180; v = 'block';
      d = (data.d) ? 135 : 45;
    }
    if (data.hasOwnProperty('y')) {
      t = (120 * data.y + 60); v = 'block';
    }
    if (data.hasOwnProperty('x')) {
      t = 180; d = 90; v = 'block';
      l = (-102 + data.x * 120); r = l;
    }
    if (Game.winner) {
      b = (Game.winner === Players.ai) ? 'red' : 'green';
    }
    this.result.style.top = t+'px';
    this.result.style.left = l+'px';
    this.result.style.right = r+'px';
    this.result.style.display = v;
    this.result.style.transform = 'rotate('+d+'deg)';
    this.result.style.borderColor = b;
  }
};

/**
 * Initializes the View and listens to all events on the DOM.
 */
(function () {
  View.cells = document.querySelectorAll(".cell");
  View.output = document.getElementById("output");
  View.loading = document.getElementById("loading");
  View.controls = document.getElementById("controls");
  View.play = document.getElementById("play");
  View.result = document.getElementById("result");
  
  var firstMove = document.getElementById("firstMove");
  var useAi = document.getElementById("useAi");
  document.getElementById('play').addEventListener('click', function() {
    if (!Game.running) {
      Game.start(firstMove.checked, useAi.checked);
    }
  });
  
  View.cells.forEach(function(cell) {
    cell.addEventListener('click', function() {
      if (Game.running) {
        var index = Array.prototype.indexOf.call(View.cells, cell);
        Game.flip({
          x: (index % 3),
          y: Math.floor(index / 3)
        }, Players.user);
      }
    });
  });
})();
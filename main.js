$(function () {
  var canvas = $('<canvas />').attr('width', 1024).attr('height', 768).addClass('main-canvas')[0];

  $('#main').append(canvas);

  var stage = new createjs.Stage(canvas);

  var w = canvas.width;
  var h = canvas.height;

  createjs.Ticker.setFPS(25);

  createjs.Ticker.on('tick', function () {
    stage.update();
  });

  var background = (function () {
    var container = new createjs.Container();
    container.width = w;
    container.height = h;
    var bgShape = new createjs.Shape();
    bgShape.graphics.beginFill('#eeeeee').drawRect(0, 0, w, h);
    container.addChild(bgShape);
    return container;
  })();
  stage.addChild(background);

  var imageArea = (function () {
    var container = new createjs.Container();
    container.width = w;
    container.height = h;
    return container;
  })();
  stage.addChild(imageArea);

  var selected = {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  };

  var maskShape = new createjs.Shape();

  var getEffectiveSelected = function () {
    var fromX, toX;
    if (selected.start.x <= selected.end.x) {
      fromX = selected.start.x;
      toX = selected.end.x;
    } else {
      fromX = selected.end.x;
      toX = selected.start.x;
    }
    var fromY, toY;
    if (selected.start.y <= selected.end.y) {
      fromY = selected.start.y;
      toY = selected.end.y;
    } else {
      fromY = selected.end.y;
      toY = selected.start.y;
    }
    return {
      from : { x: fromX, y: fromY },
      to : { x: toX, y: toY },
    }
  };
  var setSelectStart = function (x, y) {
    selected.start.x = x;
    selected.start.y = y;
    selected.end.x = x;
    selected.end.y = y;
    updateSelectArea();
  };
  var setSelectEnd = function (x, y) {
    selected.end.x = x;
    selected.end.y = y;
    updateSelectArea();
  };
  var updateSelectArea = function () {
    maskShape.graphics.clear();
    var results = getEffectiveSelected();
    maskShape.graphics
      .drawRect(0, 0, results.from.x, results.to.y)
      .drawRect(0, results.to.y, results.to.x, h - results.to.y)
      .drawRect(results.to.x, results.from.y, w - results.to.x, h - results.from.y)
      .drawRect(results.from.x, 0, w - results.from.x, results.from.y);
  };

  var selectArea = (function () {
    var container = new createjs.Container();
    container.visible = false;
    container.width = w;
    container.height = h;
    var baseShape = new createjs.Shape();
    baseShape.alpha = 0.2;
    baseShape.graphics.beginFill('#000000').drawRect(0, 0, w, h);
    container.addChild(baseShape);
    container.mask = maskShape;
    return container;
  })();

  stage.addChild(selectArea);

  var setEvents = function (image) {
    background.addEventListener('mousedown', function (event) {
      selectArea.visible = true;
      setSelectStart(event.stageX, event.stageY);
    });

    background.addEventListener('pressmove', function (event) {
      if (!selectArea.visible) {
        return;
      }
      setSelectEnd(event.stageX, event.stageY);
    });

    var MIN_SELECT_AREA = 2;
    background.addEventListener('pressup', function (event) {
      if (!selectArea.visible) {
        return;
      }
      setSelectEnd(event.stageX, event.stageY);

      if (Math.abs(selected.start.x - selected.end.x) < MIN_SELECT_AREA ||
        Math.abs(selected.start.y - selected.end.y) < MIN_SELECT_AREA) {
        // 選択反映が小さ過ぎたら閉じる
        selectArea.visible = false;
      } else {
        $('#selectResult').empty();
        // サイズ変更前の情報保持
        var cap_w = canvas.width;
        var cap_h = canvas.height;
        var cap_x = image.x;
        var cap_y = image.y;
        var cap_v = selectArea.visible;
        var results = getEffectiveSelected();
        // サイズ変更
        selectArea.visible = false;
        canvas.width = results.to.x - results.from.x;
        canvas.height = results.to.y - results.from.y;
        image.x = results.from.x  * -1;
        image.y = results.from.y  * -1;

        stage.update();

        var resultImage = $('<img />').attr('src', stage.toDataURL('#ffffff', 'image/png'));
        var resultText1 = $('<p></p>').html('[始点] x:' + results.from.x + ' y:' + results.from.y);
        var resultText2 = $('<p></p>').html('[終点] x:' + results.to.x + ' y:' + results.to.y);

        // サイズ変更前に戻す
        selectArea.visible = cap_v;
        canvas.width = cap_w;
        canvas.height = cap_h;
        image.x = cap_x;
        image.y = cap_y;

        $('#selectResult').append(resultImage);
        $('#selectResult').append(resultText1);
        $('#selectResult').append(resultText2);
        $('#myModal').modal();
      }
    });

    $('#myModal').on('hidden.bs.modal', function (e) {
      selectArea.visible = false;
    });
  };

  $.ajax({
    type: 'GET',
    url: '/data.json',
    dataType: 'json',
    success: function (json) {
      var loadQueue = new createjs.LoadQueue();
      loadQueue.loadManifest([
        { id: 'image_url', src: json.image_url },
      ]);
      loadQueue.addEventListener('complete', function () {
        imageArea.removeAllChildren();
        var image = loadQueue.getResult('image_url');
        var bm = new createjs.Bitmap(image);
        // 表示サイズ調整
        var flw = parseFloat(w);
        var flh = parseFloat(h);
        var flimw = parseFloat(image.width);
        var flimh = parseFloat(image.height);
        var aspectRatio = flw / flh;
        var imageAspectRatio = flimw / flimh;
        var scale;
        if (imageAspectRatio < aspectRatio) {
          scale = flh / flimh;
        } else {
          scale = flw / flimw;
        }
        bm.scaleX = scale / imageArea.scaleX;
        bm.scaleY = scale / imageArea.scaleY;
        imageArea.addChild(bm);

        setEvents(bm);
      });
    },
  });
});

/*
 * Implements the javascript frontend of 'kp'.
 *
 * Copyright: Jens Låås, UU 2012-2014
 * Copyright license: According to GPL, see file LICENSE in this directory.
 */
"use strict";
var baseurl, username, pathinfo, nonce;
var glob_logid = 0;
var jobs = { };
var logs = [ ];
var roles = [ ];
var lang = 'en';

var kp = {};

String.prototype.toHHMMSS = function () {
    var sec_numb    = parseInt(this);
    var hours   = Math.floor(sec_numb / 3600);
    var minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
    var seconds = sec_numb - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if(hours == 0 && minutes == 0) return seconds+"s";
    if (seconds < 10) {seconds = "0"+seconds;}
    if(hours == 0) return minutes+':'+seconds;
    if (minutes < 10) {minutes = "0"+minutes;}
    return hours+':'+minutes+':'+seconds;
}

function ajax(url, context, callback) {
    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'text',
        success: callback,
	context: context
    });
}

// _i18n[""] = '<span lang="sv"></span><span lang="en"></span>';
var i18n = {};
var _i18n = {};
_i18n["Abort"] = '<span lang="sv">Avbryt</span><span lang="en">Abort</span>';
_i18n["Abort job"] = '<span lang="sv">Avbryt körning</span><span lang="en">Abort job</span>';
_i18n["Add parameter"] = '<span lang="sv">Ny parameter</span><span lang="en">Add parameter</span>';
_i18n["Admin"] = '<span lang="sv">Administratör</span><span lang="en">Admin</span>';
_i18n["Cancel"] = '<span lang="sv">Avbryt</span><span lang="en">Cancel</span>';
_i18n["Description"] = '<span lang="sv">Beskrivning</span><span lang="en">Description</span>';
_i18n["Do nothing"] = '<span lang="sv">Gör ingenting</span><span lang="en">Do nothing</span>';
_i18n["file"] = '<span lang="sv">fil</span><span lang="en">file</span>';
_i18n["Files"] = '<span lang="sv">Filer</span><span lang="en">Files</span>';
_i18n["No"] = '<span lang="sv">Nej</span><span lang="en">No</span>';
_i18n["Run"] = '<span lang="sv">Kör</span><span lang="en">Run</span>';
_i18n["Roles"] = '<span lang="sv">Roller</span><span lang="en">Roles</span>';
_i18n["roles"] = '<span lang="sv">roller</span><span lang="en">roles</span>';
_i18n["Save"] = '<span lang="sv">Spara</span><span lang="en">Save</span>';
_i18n["Serial"] = '<span lang="sv">Seriell</span><span lang="en">Serial</span>';
_i18n["Tags"] = '<span lang="sv">Taggar</span><span lang="en">Tags</span>';
_i18n["Upload"] = '<span lang="sv">Ladda upp</span><span lang="en">Upload</span>';
_i18n["Yes"] = '<span lang="sv">Ja</span><span lang="en">Yes</span>';

i18n.t = function (text) {
    if(_i18n[text]) return _i18n[text];
    return '<span>'+text+'</span>';
};

/*
 * Resource
 * Utility functions to avoid using tags in plaintext when working with the DOM.
 */

var Resource = {};
Resource.button = {};
Resource.menu = {};
Resource.modal = {};
Resource.input = {};
Resource.table = {};

Resource.sanitize = function (s) {
    /* disable tags */
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/</g, '&lt;');
    return s;
};

Resource.__args = function (cb, elem, args, start) {
    var sane = true;
    var conv = true;
    var callback;

    for(var i=start;i<args.length;i++) {
        if(args[i] === undefined) alert(typeof args[i]);
        if(typeof args[i] == "function") {
            if(cb) {
                args[i](elem);
            } else {
                callback = args[i];
            }
            continue;
        }
        if(typeof args[i] == "string") {
            var str;
            str = args[i];
            if(sane) str = Resource.sanitize(str);
            if(conv) str = i18n.t(str);
            $(str).appendTo(elem);
            continue;
        }
        if(typeof args[i] == "object") {
            if(args[i].sanitize !== undefined && args[i].sanitize === false) sane=false;
            if(args[i].conv !== undefined && args[i].conv === false) conv=false;
            if(args[i].border) elem.attr("border", args[i].border);
            if(args[i].alt) elem.attr("alt", args[i].alt);
            if(args[i].id) elem.attr("id", args[i].id);
            if(args[i].cols) elem.attr("cols", args[i].cols);
            if(args[i].draggable) elem.attr("draggable", "true");
            if(args[i].rows) elem.attr("rows", args[i].rows);
            if(args[i].wrap) elem.attr("wrap", args[i].wrap);
            if(args[i].width) {
		elem.attr("width", args[i].width);
		elem.css("width", args[i].width);
	    }
	    if(args[i].height) {
		elem.attr("height", args[i].height);
		elem.css("height", args[i].height);
	    }
	    if(args[i].readonly) elem.attr('readonly','readonly');
            if(args[i].colspan) elem.attr("colspan", args[i].colspan);
            if(args[i].name) elem.attr("name", args[i].name);
            if(args[i].valign) elem.attr("valign", args[i].valign);
            if(args[i].maxlength) elem.attr("maxlength", args[i].maxlength);
            if(args[i].size) elem.attr("size", args[i].size);
            if(args[i].class) elem.addClass(args[i].class);
	    if(args[i].nowrap) elem.css("white-space", "nowrap");
	    if(args[i].bold) elem.css("font-weight","Bold");
	    if(args[i].tt) elem.css("font-family", "monospace");
            continue;
        }
    }
    return callback;
}

Resource._args = function (elem, args, start) {
    return Resource.__args(true, elem, args, start);
};

Resource._args_cb = function (elem, args, start) {
    return Resource.__args(false, elem, args, start);
};

Resource.button.click = function (appendtoelem, name, text, eventdata, clickfn) {
    var but = $('<button type="button" name="'+name+'">'+i18n.t(text)+'</button>');
    but.appendTo(appendtoelem);
    but.click(eventdata, clickfn);
    return but;
};

Resource.button.close = function () {
    return $('<button type="button" name="close">'+i18n.t('CLOSE')+'</button>');
};

Resource.button.ok = function () {
    return $('<button type="button" name="submit">Ok</button>');
};

Resource.button.save = function () {
    return $('<button type="button" name="submit">'+i18n.t("Save")+'</button>');
};

Resource.form = function(appendtoelem, method, enctype) {
    if(method === undefined) method="post";
    if(enctype === undefined) enctype="multipart/form-data";
    return $('<form method="'+method+'" enctype="'+enctype+'"/>').appendTo(appendtoelem);
}

Resource.header = function (appendtoelem, size) {
    var h = $('<h'+size+'>').appendTo(appendtoelem);
    for(var i=2;i<arguments.length;i++) {
        $(i18n.t(arguments[i])).appendTo(h);
    }
    return h;
};

Resource.hr = function (tableelem) {
    var hr;
    hr = $('<hr/>').appendTo(tableelem);
    Resource._args(hr, arguments, 1);
    return hr;
};

Resource.image = function (appendtoelem, src) {
    var img;
    img = $('<img src="'+src+'"/>').appendTo(appendtoelem);
    Resource._args(img, arguments, 2);
    return img;
};

Resource.input.checkbox = function (appendtoelem, value) {
    /* Resource.input.option(elem, value, [text ..]) */
    var opt;
    opt = $('<input type="checkbox" value="'+value+'"/>').appendTo(appendtoelem);
    for(var i=2;i<arguments.length;i++) {
        $('<span>'+arguments[i]+'</span>').appendTo(appendtoelem);
    }
    return opt;
};

Resource.input.file = function (appendtoelem) {
    var inp;
    inp = $('<input type="file"/>').appendTo(appendtoelem);
    Resource._args(inp, arguments, 1);
    return inp;
}

Resource.input.option = function (appendtoelem, value) {
    /* Resource.input.option(elem, value, [text ..]) */
    var opt;
    opt = $('<option value="'+value+'"/>').appendTo(appendtoelem);
    for(var i=2;i<arguments.length;i++) {
        $('<span>'+arguments[i]+'</span>').appendTo(opt);
    }
    return opt;
};

Resource.input.radio = function (appendtoelem, name, value) {
    /* Resource.input.option(elem, name, value, [text ..]) */
    var opt;
    opt = $('<input type="radio" name="'+name+'" value="'+value+'"/>').appendTo(appendtoelem);
    for(var i=3;i<arguments.length;i++) {
        $('<span>'+arguments[i]+'</span>').appendTo(appendtoelem);
    }
    return opt;
};

Resource.input.password = function (appendtoelem, label, options) {
    options.type = "password";
    return Resource.input.text(appendtoelem, label, options);
};

Resource.input.select = function (appendtoelem, name) {
    /* Resource.input.select(elem, name, [label ..]) */
    var inp, lbl;
    inp = $('<select name="'+name+'"/>');
    lbl = $('<label/>').appendTo(appendtoelem);
    for(var i=2;i<arguments.length;i++) {
        $(i18n.t(arguments[i])).appendTo(lbl);
    }
    inp.appendTo(lbl);
    return inp;
};

Resource.input.text = function (appendtoelem, label, options) {
    /*
     * Create input element with label
     * options = { name: "myname", id: "myid" }
     * Returns input element. Can be used later with .val()
     */
    var inp, lbl;
    var name = options.name;
    var id = options.id;
    var maxlength = options.maxlength;
    var size = options.size;
    var type = "text";
    if(id === undefined) id = name;
    if(name === undefined) name = id;
    if(maxlength) maxlength=' maxlength="'+maxlength+'"';
    if(size) size=' size="'+size+'"';
    if(options.type) type = options.type;
    inp = $('<input type="'+type+'" name="'+name+'" id="'+id+'" '+
            maxlength+
            size+
            '>');
    if(options.value) inp.attr("value", options.value);
    lbl = $('<label>'+i18n.t(label)+'</label>').appendTo(appendtoelem);
    inp.appendTo(lbl);
    return inp;
};

Resource.label = function (appendtoelem) {
    var lbl;
    lbl = $('<label/>').appendTo(appendtoelem);
    Resource._args(lbl, arguments, 1);
    return lbl;
}

Resource.menu.create = function (elem, fn) {
    var menu = $('<table/>').appendTo(elem);
    menu.menuelem = elem;
    fn(menu);
}

Resource.menu.item = function (elem, text, fn) {
    /* create a menuitem in a context menu. i18n enabled */
    var m;
    m = $('<tr><td>'+i18n.t(text)+'</td></tr>').appendTo(elem);
    m.click(function(event) {
            elem.hide();
            elem.menuelem.hide();
            fn();
        });
    m.on("mouseover mouseout", Resource.menu._highlight);
    return m;
};

/* used for highlighting items in context menus */
Resource.menu._highlight = function (event)
{
    if (event.type == 'mouseover') {
        if($(this).data('mflag') != '1') {
            $(this).data('bgcolor', $(this).css('background-color'));
            $(this).data('mflag', '1');
            $(this).css('background-color','red');
        }
    }
    if (event.type == 'mouseout') {
        $(this).css('background-color', $(this).data('bgcolor'));
        $(this).data('mflag', '0');
    }
    return false;
}

Resource.modal.alert = function () {
    /* Resource.modal.alert( "text" .., oldpos )
     * alert via modal overlay
     */
    var elem;
    var oldpos;
    $('#overlay').empty();
    elem = Resource.paragraph($('#overlay'));
    for(var i=0;i<arguments.length;i++) {
        if(typeof arguments[i] == "string") {
            var str;
            str = arguments[i];
            str = Resource.sanitize(str);
            str = i18n.t(str);
            $(str).appendTo(elem);
            continue;
        }
        if(typeof arguments[i] == "number") {
            oldpos = arguments[i];
        }
    }
    Resource.button.click($('#overlay'), "submit", "Ok", this, function(event){
            $('#overlay').hide();
            $('#fade').hide();
            if(oldpos) window.scrollTo(0, oldpos);
        });
    $('#overlay').show();
    $('#fade').show();
};

/* confirm via modal overlay */
Resource.modal.confirm = function (yes, no) {
    var elem, oldpos = $(window).scrollTop();
    var callback;
    window.scrollTo(0, 0);
    $('#overlay').empty();
    elem = Resource.paragraph($('#overlay'));
    callback = Resource._args_cb(elem, arguments, 2);
    Resource.button.click($('#overlay'), "yes", yes, this, function(event){
            $('#overlay').hide();
            $('#fade').hide();
            if(oldpos) window.scrollTo(0, oldpos);
            callback();
        });
    Resource.button.click($('#overlay'), "no", no, this, function(event){
            $('#overlay').hide();
            $('#fade').hide();
            if(oldpos) window.scrollTo(0, oldpos);
        });
    $('#overlay').show();
    $('#fade').show();
};

Resource.overlay = {};
Resource.overlay.show = function () {
    var elem = $('#overlay');
    elem.empty();
    Resource._args(elem, arguments, 0);
    elem.attr("previousy", $(window).scrollTop());
    window.scrollTo(0, 0);
    elem.show();
    $('#fade').show();
    $('body').css({ overflow: 'hidden' })
    return elem;
};

Resource.overlay.hide = function () {
    var y;
    $('body').css({ overflow: 'inherit' })
    $('#overlay').hide();
    $('#fade').hide();
    y = $('#overlay').attr("previousy");
    if(y) window.scrollTo(0, y);
};

Resource.paragraph = function (appendtoelem) {
    var p = $('<p/>').appendTo(appendtoelem);
    Resource._args(p, arguments, 1);
    return p;
};

Resource.link = function (appendtoelem, url) {
    var link = $('<a/>').appendTo(appendtoelem);
    link.attr("href", url);
    Resource._args(link, arguments, 2);
    return link;
};

Resource.table.table = function (appendtoelem) {
    var tbl = $('<table/>').appendTo(appendtoelem);
    Resource._args(tbl, arguments, 1);
    return tbl;
};

Resource.table.row = function (tableelem) {
    var row;
    row = $('<tr/>').appendTo(tableelem);
    Resource._args(row, arguments, 1);
    return row;
};

Resource.span = function (elem) {
    var span;
    span = $('<span/>').appendTo(elem);
    Resource._args(span, arguments, 1);
    return span;
};

Resource.div = function (elem) {
    var div;
    div = $('<div/>').appendTo(elem);
    Resource._args(div, arguments, 1);
    return div;
};

Resource.table.col = function (rowelem) {
    /* Resource.table.col( row element, Text ..) */
    var head = $('<td/>').appendTo(rowelem);
    Resource._args(head, arguments, 1);
    return head;
};

Resource.table.head = function (rowelem) {
    /* Resource.table.head( row element, Text ..) */
    var head = $('<th/>').appendTo(rowelem);
    Resource._args(head, arguments, 1);
    return head;
};

Resource.text = function (appendtoelem) {
    var span = $('<span/>').appendTo(appendtoelem);
    for(var i=1;i<arguments.length;i++) {
        $(i18n.t(arguments[i])).appendTo(span);
    }
    return span;
};

Resource.textarea = function (appendtoelem) {
    var ta = $('<textarea/>').appendTo(appendtoelem);
    Resource._args(ta, arguments, 1);
    return ta;
};

Resource.tt = function (appendtoelem) {
    var tt = $('<tt/>').appendTo(appendtoelem);
    Resource._args(tt, arguments, 1);
    return tt;
};


/*
  log object constructor.
  Starts ajax calls to fill in log information.
  The callbacks from the ajax calls will record and display log properties.
  It will refuse to create more than one object per log name.
  Starts a polling function to fetch the log as it grows.
  Returns the created log object.
*/
function Log(name) {
    var i;

    if(logs[name]) {
	return undefined;
    }

    glob_logid += 1;
    this.id = glob_logid;
    this.name = name;
    this.pos = 0;
    this.start = 0;
    this.end = 0;
    this.pollstop = 0;
    logs[ this.name ] = this;

    this.ajax = function (url, context, callback) {
	$.ajax({
            url: url,
            type: 'GET',
            dataType: 'text',
            success: callback,
	    context: context
	});
    };
    this.read_attr = function (attr) {
	this.ajax(baseurl + "_log/" + this.name + "/" + attr, { log: this, attr: attr }, this.attr_cb);
    };
    
    this.time_display = function () {
	var timestring;
	var elem = this.logtimeelem;
	
	elem.empty();
	if(this.end >= this.start) {
	    timestring = ((this.end-this.start)+"").toHHMMSS();
	    elem.append(" Runtime: " + timestring);
	} else {
	    timestring = (Math.ceil(($.now()/1000)-this.start)+"").toHHMMSS();
	    elem.append(" Runtime: " + timestring);
	}
    };
    
    this.status_display = function () {
	var elem = this.logstatuselem;
	elem.empty();
	elem.append(" Status: " + this.status);
	if(this.status == "0")
	    elem.css("background-color","lightgreen");
	else
	    elem.css("background-color","#f88");
    };
    
    this.attr_cb = function (text,status,xhr) {
	if(this.attr == "start") {
	    this.log.start = text;
	    this.log.time_display();
	}
	if(this.attr == "end") {
	    this.log.end = text;
	    this.log.time_display();
	}
	if(this.attr == "status") {
	    this.log.status = text;
	    this.log.status_display();
	    this.log.pollstop += 1;
	    if(this.log.pollstop > 2) {
		clearInterval(this.log.timer);
		this.log.timer = undefined;
	    }
	}
    }

    this.read = function () {
	this.framework_create();
	this.read_attr("start");
	this.read_attr("end");
	this.read_attr("status");
    }

    this.framework_create = function () {
	var self=this;
	if(!this.elem) {
	    this.elem = Resource.table.table($('#logs'), { border: 0, class: "logtable" }, function (tbl) {
		Resource.table.row(tbl, function (row) {
		    Resource.table.col(row, { colspan: 3 }, function (col) {
			Resource.image(col, baseurl+'close.png', { width: 18, height: 18 }, function (img) {
			    img.click(self, function (event) {
				event.data.remove();
			    });
			});
			Resource.image(col, baseurl+'plus.png', { width: 18, height: 18 }, function (img) {
			    img.click(self, function (event) {
				event.data.dataelem.toggle(30);
			    });
			});
			Resource.text(col, self.name);
		    });
		});
		Resource.table.row(tbl, function (row) {
		    self.logtimeelem = Resource.table.col(row);
		    self.logstatuselem = Resource.table.col(row);
	    	    Resource.table.col(row, function (col) {
			Resource.link(col, baseurl+ '_log/' +self.name, function(link) {
			    Resource.image(link, baseurl+'download.png', { width: 18, height: 18 });
			});
		    });
		    Resource.table.row(tbl, function (row) {
			Resource.table.col(row, { colspan: 3 }, function (col) {
			    self.dataelem = Resource.textarea(col, { conv: false, readonly: true, class: 'log', wrap: 'off', cols: 40, rows: 35 });
			});
		    });
		});
	    });
	}
    }

    //function byteCount(s) {
//	return encodeURI(s).split(/%..|./).length - 1;
 //   }
    this.lengthInUtf8Bytes = function(str) {
    // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
	var m = encodeURIComponent(str).match(/%[89ABab]/g);
	return str.length + (m ? m.length : 0);
    }
    
    /*
      '&' (ampersand) becomes '&amp;'
      '"' (double quote) becomes '&quot;' when ENT_NOQUOTES is not set.
      "'" (single quote) becomes '&#039;' (or &apos;) only when ENT_QUOTES is set.
      '<' (less than) becomes '&lt;'
      '>' (greater than) becomes '&gt;'
    */
    this.lengthhtmlencoding = function (str) {
	var l = 0;
	var m;
	m = str.match(/&amp;/g);
	if(m) l += (m.length*4);
	m = str.match(/&quot;/g);
	if(m) l += (m.length*5);
	m = str.match(/&lt;/g);
	if(m) l += (m.length*3);
	m = str.match(/&gt;/g);
	if(m) l += (m.length*3);
	return l;
    }
    
    this.poll_cb = function (text,status,xhr) {
	this.dataelem.append(text);
	this.pos += this.lengthInUtf8Bytes(text);
	this.pos -= this.lengthhtmlencoding(text);
	this.dataelem.scrollTop(this.dataelem[0].scrollHeight);
    }
    
    this.poll = function() {
	this.read();
	this.ajax(baseurl + "_log/" + this.name + "?start="+this.pos, this, this.poll_cb);
    }

    this.remove = function() {
	if(this.timer != undefined) clearInterval(this.timer);
	this.elem.empty();
	logs[this.name] = undefined;
    }

    this.poll();

    /* use variable, since setInterval's this is the global context */
    var log = this;
    this.timer = setInterval(function(){
	log.poll();
    }, 2000);
    
    return this;
}

/*
  Param object constructor
  
*/
function Param(parent, n, definition) {
    this.parent = parent;
    this.def = definition;
    this.n = n;
    this.edit = 0;
    
    this.copy = function (parent, n) {
	var cp;
	cp = new Param();
	cp.parent = parent;
	cp.def = this.def;
	cp.n = n;
	cp.edit = this.edit;
	return cp;
    }
    
    this.display = function () {
	var self=this;
	var i;
	this.elem.empty();
	
	if(this.edit) {
	    Resource.div(self.elem, 'Parameter '+this.n);
	    self.dataelem = Resource.textarea(self.elem, { conv: false, wrap: 'off', cols: 20, rows: 5 });
	    self.dataelem.val(self.def);
	    self.value = function () {
		return self.dataelem.val();
	    };
	} else {
	    var arr = this.def.split(':');
	    
	    Resource.div(self.elem, arr[0], ": ");
	    arr = this.def.substring(this.def.indexOf(":")).split('\n');
	    arr = arr[0].split(' ');
	    arr = jQuery.grep( arr, function (e) { return e.length > 0; } );
	    arr.shift();
	    if(arr[0] == "text") {
		var maxlen = 256;
		var dispsize = 8;
		if(arr.length >= 2) maxlen = arr[2];
		if(arr.length >= 3) dispsize = arr[3];
		self.dataelem = Resource.input.text(self.elem, '', { maxlength: maxlen, size: dispsize });
		self.value = function () {
		    return this.dataelem.val();
		}
	    }
	    if(arr[0] == "select") {
		var maxlen = arr[2];
		self.dataelem = Resource.input.select(self.elem, "select");
		for(i=3;i<arr.length;i++) {
		    var opttext;
		    if(arr[i].length > maxlen)
			opttext = ".."+arr[i].substr(arr[i].length - maxlen);
		    else
			opttext = arr[i];
		    Resource.input.option(self.dataelem, arr[i], opttext);
		}
		this.value = function () {
		    return this.dataelem.val();
		}
	    }
	    if(arr[0] == "checkbox") {
		var maxlen = arr[2];
		self.dataelem = Resource.div(self.elem, function (box) {
		    for(i=3;i<arr.length;i++) {
			var opttext;
			if(arr[i].length > maxlen)
			    opttext = ".."+arr[i].substr(arr[i].length - maxlen);
			else
			    opttext = arr[i];
			Resource.div(box, function (div) {
			    Resource.input.checkbox(div, arr[i], opttext);
			});
		    }
		});
		this.value = function () {
		    var values;
		    var val="";
		    values = this.dataelem.find('input');
		    for(i=0;i<values.length;i++) {
			if(values[i].checked) {
			    if(val.length) val += ",";
			    val += values[i].value;
			}
		    }
		    return val;
		}
	    }
	    if(arr[0] == "radio") {
		var options = "";
		var maxlen = arr[2];
		self.dataelem = Resource.div(self.elem, function (elem) {
		    for(i=3;i<arr.length;i++) {
			var opttext;
			if(arr[i].length > maxlen)
			    opttext = ".."+arr[i].substr(arr[i].length - maxlen);
			else
			    opttext = arr[i];
			Resource.div(elem, function (div) {
			    Resource.input.radio(div, self.n, arr[i], opttext);
			});
		    }
		});
		this.value = function () {
		    var values;
		    var val="";
		    values = this.dataelem.find('input');
		    for(i=0;i<values.length;i++) {
			if(values[i].checked) {
			    if(val.length) val += ",";
			    val += values[i].value;
			}
		    }
		    return val;
		}
	    }
	}
    }
    
    this.framework_create = function () {
	var self=this;
	if(!this.elem) {
	    Resource.table.row(self.parent, function (row) {
		self.elem = Resource.table.col(row, { class: 'param' }, 'AAAA'+self.n);
	    });
	}
    }

    this.remove = function () {
	if($(this.id).length != 0) {
	    $(this.id).empty();
	}
    }
    
    return this;
}

/*
  Job object constructor.
  Starts ajax calls to fill in job information.
  The callbacks from the ajax calls will record and display job properties.
  Starts a polling function to update the log history.
  Returns the created job object.
*/
function Job(name) {
    if(jobs[name])
	return undefined;
    
    jobs[name] = this;
    
    this.histelems = [];
    this.edit = 0;
    this.name = name;
    this.nicename = name;
    this.justcreated = 0;
    this.adminroles = '';
    this.admin = "0";
    this.params = [];
    this.files = [];
    this.serial = 'no';
    this.options = {};
    this.pollcounter = 0;
    this.pollnow = 0;
    this.ajax = function (url, context, callback, errorcb) {
	$.ajax({
            url: url,
            type: 'GET',
            dataType: 'text',
            success: callback,
	    error: errorcb,
	    context: context
	});
    };
    this.editmode = function (mode) {
	var i;
	if( (mode == 0) && (this.edit != mode) ) {
	    if(this.params_backup !== undefined) {
		for(i=0;i<this.params.length;i++) {
		    this.params[i].remove();
		}
		this.params = this.params_backup;
		this.params_backup = undefined;
	    }
	}
	this.edit = mode;
	for(i=0;i<this.params.length;i++) {
	    this.params[i].edit = mode;
	}
    }

    this.post = function (url, context, callback, errorcb, data) {
	data['nonce'] = nonce;
	$.ajax({
            url: url,
            type: 'POST',
	    data: data,
            dataType: 'text',
            success: callback,
	    error: errorcb,
	    context: context
	});
    };
    this.postfile = function (url, context, callback, data) {
	data['nonce'] = nonce;
	$.ajax({
            url: url,
            type: 'POST',
	    data: data,
            success: callback,
	    context: context,
            cache: false,
            contentType: false,
            processData: false
	});
    };
    this.nicename_display = function () {
	this.nameelem.empty();
	if(this.edit) {
	    var elem = Resource.input.text(this.nameelem, '', { value: this.nicename });
	    this.nicename_value = function () {
		return elem.val();
            }
	    return;
	}
	this.nameelem.append(this.nicename);
    }
    this.roles_display = function () {
	this.roleselem.empty();
	if(this.edit) {
	    Resource.div(this.roleselem, 'Roles',':');
	    var elem = Resource.textarea(this.roleselem, { conv: false, cols: 10, rows: 5 });
	    elem.val(this.roles);
	    this.roles_value = function () {
		return elem.val();
	    }
	}
    }
    this.adminroles_display = function () {
	this.admroleelem.empty();
	if(this.edit) {
	    Resource.div(this.admroleelem, 'Admin',' ','roles',':');
	    var elem = Resource.textarea(this.admroleelem, { cols: 10, rows: 5 });
	    elem.val(this.adminroles);
	    this.adminroles_value = function () {
		return elem.val();
	    }
	}
    }
    this.tags_display = function () {
	this.tagselem.empty();
	if(this.edit) {
	    Resource.div(this.tagselem, 'Tags',':');
	    var elem = Resource.textarea(this.tagselem, { cols: 10, rows: 5 });
	    elem.val(this.tags);
	    this.tags_value = function () {
		return elem.val();
	    }
	}
    }
    this.serial_display = function () {
	var self=this;
	this.serialelem.empty();
	if(this.edit) {
	    Resource.div(this.serialelem, 'Serial',':', function (div) {
		var elem = Resource.input.checkbox(div, self.serial);
		if(self.serial == "yes")
		    elem.prop('checked', true);
		else
		    elem.prop('checked', false);
		self.serial_value = function () {
		    if(self.serialelem.find('input')[0].checked) return 'yes';
		    return 'no';
		}
	    });
	}
    }
    this.options_display = function () {
	var self=this;
	this.optionselem.empty();
	if(this.edit) {
	    Resource.div(this.optionselem, 'Blue',':', function (div) {
		var elem = Resource.input.checkbox(div, "blue");
		if(self.options.blue)
		    elem.prop('checked', true);
		else
		    elem.prop('checked', false);
	    });
	}
    }
    this.options_value = function () {
	this.options.blue = this.optionselem.find('[value="blue"]')[0].checked;
	return JSON.stringify(this.options);
    }

    this.description_display = function () {
	this.descelem.empty();
	if(this.edit) {
	    Resource.div(this.descelem, 'Description',':');
	    var elem = Resource.textarea(this.descelem, { cols: 60, rows: 15 });
	    elem.val(this.description);
	    this.description_value = function () {
		return elem.val();
	    };
	} else {
	    this.descelem.append(this.description);
	}
    }
    this.param_add = function () {
	param = new Param(this.paramelem, this.params.length+1, "Caption:");
	if(this.edit) param.edit = 1;
	this.params.push(param);
	param.framework_create();
	param.display();
    }
    
    this.params_display = function () {
	var i;
	for(i=0;i<this.params.length;i++) {
	    this.params[i].display();
	}
	if(this.edit) {
	    if(!this.paramaddelem) {
		this.paramaddelem = Resource.button.click(this.paramelem, "addparam", "Add parameter", this, function (event) {
		    event.data.param_add();
		});
	    }
	} else {
	    if(this.paramaddelem) {
		this.paramaddelem.remove();
		this.paramaddelem = undefined;
	    }
	}
    }
    this.message_display = function (msg) {
	this.messageelem.empty();
	Resource.span(this.messageelem, { bold: true }, msg);
    }

    this.run_cb = function (text,status,xhr) {
	this.messageelem.empty();
	if(text.length > 8) new Log(text);
    }
    this.update_cb = function (text,status,xhr) {
	this.messageelem.empty();
	this.editmode(0);
	this.justcreated = 0;
	this.display();
	this.read();
    }
    this.delete_cb = function (text,status,xhr) {
	this.elem.remove();
	this.jobdataelem.remove();
	jobs[this.name] = undefined;
	if(this.timer != undefined) clearInterval(this.timer);
    }
    
    this.run_ecb = function (xhr,status,text) {
	this.message_display("ERR: " + xhr.status +  " " + text);
    }
    
    this.run_display = function () {
	var self=this;
	this.runelem.empty();
	if(this.edit) {
	    Resource.div(this.runelem, 'Script:', function (div) {
		var elem = Resource.image(div, baseurl+'pencil.png', { width: 18, height: 18 });
		elem.click(self, function(event) {
		    Resource.overlay.show( function (olay) {
			Resource.div(olay, 'Script:');
			var elem = Resource.textarea(olay, { height: '80%', width: '90%' });
			elem.val(event.data.run);
			Resource.div(olay, function (div) {
			    Resource.button.click(div, "submit", "Ok", event.data, function(event){
				Resource.overlay.hide();
				event.data.runelem.find('textarea').val(elem.val());
			    });
			    Resource.button.click(div, "submit", "Cancel", event.data, function(event){
				Resource.overlay.hide();
			    });
			});
		    });
		});
	    });

	    var elem = Resource.textarea(this.runelem, { readonly: true, cols: 20, rows: 15 });
	    elem.val(this.run);
	    this.run_value = function () {
		return elem.val();
	    };
	    
	    Resource.button.click(this.runelem, "save", "Save", this, function (event) {
		var params = {};
		var i;
		params['nicename'] = event.data.nicename_value();
		for(i=0;i<event.data.params.length;i++) {
		    params['param'+event.data.params[i].n] = event.data.params[i].value();
		}
		params['description'] = event.data.description_value();
		params['tags'] = event.data.tags_value();
		params['serial'] = event.data.serial_value();
		params['options'] = event.data.options_value();
		params['roles'] = event.data.roles_value();
		params['adminroles'] = event.data.adminroles_value();
		params['run'] = event.data.run_value();
		if(event.data.justcreated == 1)
		    params['create'] = 'yes';
		event.data.post(baseurl + "_exe/" + event.data.name + "/update",
				event.data,
				event.data.update_cb,
				event.data.run_ecb,
				params);
	    });
	} else {
	    Resource.button.click(this.runelem, "run", "Run", this, function(event) {
		var postparams = {};
		var i;
		for(i=0;i<event.data.params.length;i++) {
		    postparams['param'+event.data.params[i].n] = event.data.params[i].value();
		}
		if(confirm("Run: '"+event.data.nicename+"' ?")) {
		    event.data.post(baseurl + "_exe/" + event.data.name + "/run",
				    event.data,
				    event.data.run_cb,
				    event.data.run_ecb,
				    postparams);
		    event.data.pollnow = 5;
		}
	    });
	    if(this.options.blue) {
		this.jobdataelem.addClass('blue');
		this.jobdataelem.removeClass('jobrow');
	    } else {
		this.jobdataelem.addClass('jobrow');
	    }
	}
    }

    this.edit_display = function () {
	var self=this;
	this.editelem.empty();
	if(this.edit) {
	    var elem = Resource.image(this.editelem, baseurl+'close.png', { width: 18, height: 18 });
	    elem.click(this, function(event) {
                event.data.editmode(0);
                event.data.display();
            });
	    elem = Resource.image(this.editelem, baseurl+'trashcan.png', { width: 18, height: 22 });
	    elem.click(this, function(event) {
		if(event.data.justcreated == 1) {
		    event.data.delete_cb();
		} else {
		    if(confirm("Delete job "+event.data.name+"?")) {
			event.data.post(baseurl + "_exe/" + event.data.name + "/delete",
					event.data,
					event.data.delete_cb,
					event.data.run_ecb,
					{});
		    }
		}
	    });
	} else {
	    if(this.admin == "1" || this.justcreated == 1) {
		var elem = Resource.image(this.editelem, baseurl+'pencil.png', { width: 18, height: 18 });
		elem.click(this, function(event) {
		    event.data.editmode(1);
		    event.data.display();
		    event.data.message_display('');
		});
	    }
	    Resource.link(this.editelem, '?link='+self.name, function(link) {
                Resource.image(link, baseurl+'download.png', { width: 18, height: 18, alt: 'Direct link'} );
            });
	}
    }

    this.sendfile = function (formdata, name) {
	this.postfile(baseurl + "_file/" + this.name + "/put/"+name,
			this,
			this.read_files,
			formdata);
    }

    this.files_display = function () {
	var self=this;
	var i;
	this.fileselem.empty();
	if(this.edit) {
	    Resource.div(self.fileselem, "Files", ":");
	    Resource.table.table(self.fileselem, function (tbl) {
		for(i=0;i<self.files.length;i++) {
		    Resource.table.row(tbl, { class: "files" }, function (row) {
			Resource.table.col(row, self.files[i]);
			Resource.table.col(row, function (td) {
			    var elem = Resource.image(td, baseurl+'close.png', { width: 18, height: 18 } );
			    elem.click({ job: self, n: i }, function(event) {
				if(confirm("Delete file " + event.data.job.files[event.data.n] + "?")) {
				    event.data.job.ajax(baseurl + "_file/" + event.data.job.name + "/del/" + event.data.job.files[event.data.n] , event.data.job, event.data.job.read_files);
				}
			    });
			});
		    });
		}
	    });

	    var elem = Resource.form(self.fileselem);
	    Resource.label(elem, "Upload"," ", "file",":", function (lbl) {
		Resource.div(lbl, function (div) {
		    self.fileelem = Resource.input.file(div, { name: "file" });
		});
	    });
	    Resource.button.click(elem, "submit", "Upload", self, function(event) {
		var fileInput = event.data.fileelem;
		var file = fileInput.prop('files')[0];
		var formData = new FormData();
		formData.append('file', file);
		event.data.sendfile(formData, file.name);
	    });
	}
    }

    this.history_display = function () {
	var i, elem, anim;
	var loginfo, logname, logstatus;
	var self=this;

	this.histelem.empty();
	for(i=0;i<this.logs.length;i++) {
	    loginfo = this.logs[i].split(' ');
	    logname = loginfo[0];
	    logstatus = loginfo[1];
	    if(logstatus == "r")
		anim = 'running';
	    else
		anim = '';
	    
	    self.histelems[i] = Resource.div(self.histelem, function (div) {
		Resource.tt(div, { class: anim }, logname);
	    });
	    
	    if(logstatus == "0")
		self.histelems[i].css("background-color","lightgreen");
            else {
		if(logstatus != "r")
		    self.histelems[i].css("background-color","#faa");
	    }
	    
	    self.histelems[i].click(logname, function(event) {
		new Log(event.data);
	    });

	    self.histelems[i].on("mouseover mouseout", function(event) {
		if (event.type == 'mouseover') {
		    if($(this).data('mflag') != '1') {
			$(this).data('bgcolor', $(this).css('background-color'));
			$(this).data('mflag', '1');
			$(this).css('background-color','white');
		    }
		}
		if (event.type == 'mouseout') {
		    $(this).css('background-color', $(this).data('bgcolor'));
		    $(this).data('mflag', '0');
		}
		return false;
	    });
	    
	    if(logstatus == "r") {
		self.histelems[i].bind("contextmenu", function (logname) {
		    return function(event) {
			var elem;
			event.preventDefault();
			elem = $("div.custom-menu");
			elem.empty();
			Resource.menu.create(elem, function (menu) {
			    Resource.menu.item(menu, 'Abort', function () {
				Resource.modal.confirm("Abort job", "Do nothing", "Abort job", " ", logname, function() {
				    alert("aborting "+logname);
				});
			    });
			    elem.css({top: event.pageY + "px", left: event.pageX + "px"}).show();
			});
		    };
		}(logname));
	    }
	}
    }

    // this is structure object with members job and attr
    this.param_cb = function (text,status,xhr) {
	var param;
	this.job.ajax(baseurl + "_exe/" + this.job.name + "/param" + (this.attr +1), { job: this.job, attr: (this.attr+1) }, this.job.param_cb);
	for(var i=0;i<this.job.params.length;i++) {
	    if(this.job.params[i].n == this.attr) {
		param = this.job.params[i];
		param.def = text;
		break;
	    }
	}
	if(param === undefined) {
	    param = new Param(this.job.paramelem, this.attr, text);
	    this.job.params.push(param);
	    param.framework_create();
	}
	param.display();
    }

    this.attr_cb = function (text,status,xhr) {
	if(this.attr == "description") {
	    this.job.description = text;
	    this.job.description_display();
	}
	if(this.attr == "name") {
	    this.job.nicename = text;
	    this.job.nicename_display();
	}
	if(this.attr == "run") {
	    this.job.run = text;
	    this.job.run_display();
	}
	if(this.attr == "roles") {
	    this.job.roles = text;
	    this.job.roles_display();
	}
	if(this.attr == "adminroles") {
	    this.job.adminroles = text;
	    this.job.adminroles_display();
	}
	if(this.attr == "tags") {
	    this.job.tags = text;
	    this.job.tags_display();
	}
	if(this.attr == "serial") {
	    this.job.serial = text;
	    this.job.serial_display();
	}
	if(this.attr == "admin") {
	    this.job.admin = text;
	    this.job.edit_display();
	}
	if(this.attr == "options") {
	    this.job.options = JSON.parse(text);
	    this.job.options_display();
	}
	if(this.cb) this.cb.call(this.job);
    }
    
    this.attr_ecb = function (text,status,xhr) {
	if(this.cb) this.cb.call(this.job);
    }

    this.history_cb = function (text,status,xhr) {
	if(this.logs) {
	    for(var i=0;i<this.logs.length;i++) {
		this.histelems[i].off('click mouseover mouseout');
	    }
	}
	this.logs = text.split('\n').filter(function (e) {if(e.length >0) return true;return false;});
	this.history_display();
    }
    
    this.files_cb = function (text,status,xhr) {
	this.files = text.split('\n').filter(function (e) {if(e.length >0) return true;return false;});
	this.files_display();
    }

    this.read_attr = function (attr, cb) {
	this.ajax(baseurl + "_exe/" + this.name + "/" + attr, { job: this, attr: attr, cb: cb }, this.attr_cb, this.attr_ecb);
    };
    this.read_params = function (param_no) {
	this.ajax(baseurl + "_exe/" + this.name + "/param" + param_no, { job: this, attr: param_no }, this.param_cb);
    };
    this.read_history = function () {
	this.ajax(baseurl + "_exe/" + this.name + "/logs" , this, this.history_cb);
    };
    this.read_files = function () {
	this.ajax(baseurl + "_file/" + this.name + "/list" , this, this.files_cb);
    }
    this.display = function () {
	this.nicename_display();
	this.params_display();
	this.edit_display();
	this.run_display();
	this.roles_display();
	this.adminroles_display();
	this.tags_display();
	this.serial_display();
	this.options_display();
	this.description_display();
	if(this.edit) 
	    this.read_files();
	else
	    this.files_display();
    }
    this.readrest = function () {
	this.read_attr("description");
	this.read_attr("name");
	this.read_params(1);
	this.read_attr("run");
	this.read_attr("roles");
	this.read_attr("adminroles");
	this.read_attr("tags");
	this.read_attr("serial");
	this.read_attr("admin");
	this.read_history();
	if(this.edit) this.read_files();
	this.edit_display();
    }
    this.read = function () {
	this.framework_create();
	this.read_attr("options", this.readrest);
    };

    this.drop = function (data) {
	var src, i;
	src = jobs[data];
	if(this.edit) {
	    this.descelem.find('textarea').val(src.description);
	    this.admroleelem.find('textarea').val(src.adminroles);
	    this.roleselem.find('textarea').val(src.roles);
	    this.tagselem.find('textarea').val(src.tags);
	    this.runelem.find('textarea').val(src.run);
	    /* remove params */
	    if(this.params_backup === undefined) {
		this.params_backup = this.params;
	    }
	    for(i=0;i<this.params.length;i++) {
		this.params[i].remove();
	    }
	    this.params = [];
	    
	    /* copy params */
	    for(i=0;i<src.params.length;i++) {
		this.params.unshift(src.params[i].copy(this.paramelem, i+1));
	    }
	    
	    /* display params */
	    this.editmode(1);
	    for(i=0;i<this.params.length;i++) {
		this.params[i].framework_create();
		this.params[i].display();
	    }
	}
    }
    
    this.framework_create = function () {
	var self = this;
	if (!this.elem) {
	    this.elem = Resource.table.row($('#items'), { class: "jobrow" }, function (row) {
		Resource.table.col(row, { colspan: 2 }, function (col) {
		    Resource.image(col, baseurl+'plus.png', { width: 18, height: 18 }, function (img) {
                        img.click(self, function (event) {
                            event.data.jobdataelem.toggle(30);
			    if(localStorage[event.data.name+'.'+'hide'] == 1)
				localStorage[event.data.name+'.'+'hide'] = 0;
			    else
				localStorage[event.data.name+'.'+'hide'] = 1;
                        });
                    });
		    self.nameelem = Resource.span(col, { draggable: true, class: "name" }, self.name);
		    self.editelem = Resource.span(col, { class: "name" });
		});
		self.jobdataelem = Resource.table.row($('#items'), { class: "jobrow" }, function (row) {
		    Resource.table.col(row, { valign: "top" }, function (col) {
			Resource.table.table(col, { border: 0 }, function (tbl) {
			    Resource.table.row(tbl, function (row) {
				self.descelem = Resource.table.col(row, { class: "desc" });
			    });
			    Resource.table.row(tbl, function (row) {
				self.admroleelem = Resource.table.col(row);
			    });
			    Resource.table.row(tbl, function (row) {
				self.roleselem = Resource.table.col(row);
			    });
			    Resource.table.row(tbl, function (row) {
				self.tagselem = Resource.table.col(row);
			    });
			    Resource.table.row(tbl, function (row) {
				self.serialelem = Resource.table.col(row);
			    });
			    Resource.table.row(tbl, function (row) {
				self.optionselem = Resource.table.col(row);
			    });
			});
		    });
		    Resource.table.col(row, { valign: "top", nowrap: true }, function (col) {
			self.paramelem = Resource.table.table(col, { border: 0 });
			Resource.table.table(col, { border: 0 }, function (tbl) {
			    Resource.table.row(tbl, function (row) {
				self.messageelem = Resource.table.col(row, { class: "message" });
				});
			});
		    });
		    Resource.table.col(row, { valign: "top" }, function (col) {
			Resource.table.table(col, { border: 0 }, function (tbl){
			    Resource.table.row(tbl, function (row) {
                                self.fileselem = Resource.table.col(row, { valign: "top" });
                            });
			    Resource.table.row(tbl, function (row) {
                                self.runelem = Resource.table.col(row, { class: "run", valign: "top" });
                            });
			});
		    });
		    self.histelem = Resource.table.col(row, { valign: "top", class: "history" }, "logg historik");
		});
	    });
	    
	    var job = this;
	    self.nameelem.bind('dragstart', function(event) {
		/* use variable, since bind's this is the global context */
		event.originalEvent.dataTransfer.setData("text/plain",job.name);
	    });
	    self.nameelem.bind('dragover', function(event) {
		event.originalEvent.stopPropagation();
		event.originalEvent.preventDefault();
	    });
	    self.nameelem.bind('dragenter', function(event) {
		event.originalEvent.stopPropagation();
		event.originalEvent.preventDefault();
	    });
	    self.nameelem.bind('drop', function(event) {
		event.originalEvent.stopPropagation();
		event.originalEvent.preventDefault();
		job.drop(event.originalEvent.dataTransfer.getData("text/plain"));
	    });
	    if(localStorage[this.name+'.'+'hide'] === undefined) {
		self.jobdataelem.hide();
		localStorage[this.name+'.'+'hide'] = 1;
	    } else {
		if(localStorage[this.name+'.'+'hide'] == 0)
		    self.jobdataelem.hide();
	    }
	}
    }

    this.poll = function() {
	if(this.pollnow > 0) {
	    this.pollcounter = 0;
	    this.pollnow = this.pollnow-1;
	}
	if(this.pollcounter < 1) {
	    this.read_history();
	    this.pollcounter = 20;
	}
	this.pollcounter = this.pollcounter-1;
    };

    /* use variable, since setInterval's this is the global context */
    var job = this;
    this.timer = setInterval(function(){
	job.poll();
    }, 1000);

    this.read();
    return this;
}

function gotlist(text) {
    var arr = text.split('\n');
    
    arr.sort();
    for(var i=0;i<arr.length;i++) {
	if(arr[i].length < 2) continue;
	if(kp.link !== undefined && arr[i] != kp.link) continue;
	new Job(arr[i]);
    }
}

function gotroles(text) {
    $("#roles").empty();
    Resource.image($("#roles"), baseurl+'key.png', { width: 18, height: 18 });
    Resource.text($("#roles"), text);
    roles = text.split('\n');
}

function gottags(text) {
    var arr = text.split('\n');
    var curtags = pathinfo.split('/');
    var link, path, pathv, selected, linkname;

    curtags = curtags.filter(function (e) {if(e.length >0) return true;return false;});

    Resource.text($("#tags"),"Tags",": ");

    for(var i=0;i<arr.length;i++) {
	if(arr[i].length < 2) continue;
	arr.sort();
	selected = false;
	if($.inArray(arr[i], curtags) >= 0) {
	    pathv = curtags.filter(function (e) {if(e == arr[i]) return false;return true;});
	    path = pathv.join('/');
	    linkname = arr[i];
	    selected = true;
	} else {
	    if(pathinfo.length > 1)
		path = pathinfo.substr(1) + "/" + arr[i];
	    else
		path = arr[i];
	    linkname = arr[i];
	}
	Resource.link($("#tags"), baseurl+"kp/"+path, function(link) {
	    Resource.span(link, { bold: selected }, linkname);
	});
	Resource.text($("#tags"), " ");
    }
}

$(function () {
    // i18n: el cheapo
    lang = $("#user").attr("alang");
    var langs = lang.split(',');
    for(var i=0;i<langs.length;i++) {
        if(langs[i].indexOf("sv") == 0) {
	    document.body.className = "sv";
            break;
        }
        if(langs[i].indexOf("en") == 0) {
	    document.body.className = "en";
            break;
        }
    }

    $.QueryString = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'));
    kp.link = $.QueryString['link'];
    
    $("#kp").append('<div id="overlay"></div><div id="fade"></div>');
    //Right click menu
    $('<div class="custom-menu"></div>').appendTo("body").hide();
    $(document).bind("mousedown", function(event) {
	if($(event.target).parents("div.custom-menu").length == 0) {
            if(!$(event.target).is("div.custom-menu"))
                $("div.custom-menu").hide();
        }
    });

    baseurl = $("#user").attr("baseurl") + "/";
    username = $("#user").attr("username");
    pathinfo = $("#user").attr("pathinfo");
    var curtags = pathinfo.split('/');
    curtags = curtags.filter(function (e) {if(e.length >0) return true;return false;});
    nonce = $("#user").attr("nonce");
    createjob = $("#user").attr("createjob");
    if(curtags.length || (kp.link !== undefined)) {
	$.get(baseurl + "_view" + pathinfo,
	      function(text, status, xhr) { gotlist(text); },
	      "text");
    }
    $.get(baseurl + "_auth/" + username,
	  function(text, status, xhr) { gotroles(text); },
	  "text");
    $.get(baseurl + "_tags" + pathinfo,
	  function(text, status, xhr) { gottags(text); },
	  "text");
    if(createjob == "1") {
	$("#createjob").append('<img WIDTH=18 HEIGHT=18 src="'+baseurl+'blueplus.png" id="createbutton">');
	$('#createbutton').click(this, function(event) {
	    var d = new Date();
	    var job = new Job(username+'-'+Math.round((d.getTime()/1000)-1363361021));
	    job.edit = 1;
	    job.justcreated = 1;
	    job.description = 'What this job does';
	    job.roles = roles.join('\n');
	    job.adminroles = roles[0];
	    job.run = '';
	    job.tags = 'new';
	    job.display();
	});
    }
});

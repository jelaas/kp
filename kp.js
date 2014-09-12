/*
 * Implements the javascript frontend of 'kp'.
 *
 * Copyright: Jens Låås, UU 2012
 * Copyright license: According to GPL, see file LICENSE in this directory.
 */
var baseurl, username, pathinfo, nonce;
var glob_logid = 0;
var jobs = { };
var logs = [ ];
var roles = [ ];

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
i18n = {};
_i18n = {};
_i18n["No"] = '<span lang="sv">Nej</span><span lang="en">No</span>';
_i18n["Yes"] = '<span lang="sv">Ja</span><span lang="en">Yes</span>';

i18n.t = function (text) {
    if(_i18n[text]) return _i18n[text];
    return '<span>'+text+'</span>';
};

/*
 * Resource
 * Utility functions to avoid using tags in plaintext when working with the DOM.
 */

Resource = {};
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
            if(args[i].id) elem.attr("id", args[i].id);
            if(args[i].cols) elem.attr("cols", args[i].cols);
            if(args[i].rows) elem.attr("rows", args[i].rows);
            if(args[i].wrap) elem.attr("wrap", args[i].wrap);
            if(args[i].width) elem.attr("width", args[i].width);
	    if(args[i].height) elem.attr("height", args[i].height);
	    if(args[i].readonly) elem.attr('readonly','readonly');
            if(args[i].colspan) elem.attr("colspan", args[i].colspan);
            if(args[i].name) elem.attr("name", args[i].name);
            if(args[i].maxlength) elem.attr("maxlength", args[i].maxlength);
            if(args[i].size) elem.attr("size", args[i].size);
            if(args[i].class) elem.addClass(args[i].class);
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

Resource.input.option = function (appendtoelem, value) {
    /* Resource.input.option(elem, value, [text ..]) */
    var opt;
    opt = $('<option value="'+value+'"/>').appendTo(appendtoelem);
    for(var i=2;i<arguments.length;i++) {
        $('<span>'+arguments[i]+'</span>').appendTo(opt);
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
    lbl = $('<label>'+i18n.t(label)+'</label>').appendTo(appendtoelem);
    inp.appendTo(lbl);
    return inp;
};

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
    m.on("mouseover mouseout", highlight);
    return m;
};

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
    return elem;
};

Resource.overlay.hide = function () {
    var y;
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
    var link = $('<a href="'+url+'"/>').appendTo(appendtoelem);
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
			    self.dataelem = Resource.textarea(col, { readonly: true, class: 'log', wrap: 'off', cols: 40, rows: 35 });
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
    
    this.poll_cb = function (text,status,xhr) {
	this.dataelem.append(text);
	this.pos += this.lengthInUtf8Bytes(text);
	this.dataelem.scrollTop=this.dataelem.scrollHeight;
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
function Param(containerid, n, definition) {
    this.container = containerid;
    this.def = definition;
    this.n = n;
    this.id = '#'+this.container+" tr td[id='"+this.n+"']";
    this.edit = 0;
    
    this.copy = function (containerid, n) {
	var cp;
	cp = new Param();
	cp.container = containerid;
	cp.def = this.def;
	cp.n = n;
	cp.id = '#'+cp.container+" tr td[id='"+cp.n+"']";
	cp.edit = this.edit;
	return cp;
    }

    this.display = function () {
	$(this.id).empty();
	
	if(this.edit) {
	    $(this.id).append('Parameter '+this.n + '<br><textarea  cols=20 rows=5>'+this.def+'</textarea>');
	    this.value = function () {
		return $(this.id+' textarea').val();
	    }
	} else {
	    var arr = this.def.split(':');
	    $(this.id).append("<b>" + arr[0] + ":</b> ");
	    arr = this.def.substring(this.def.indexOf(":")).split('\n');
	    arr = arr[0].split(' ');
	    arr = jQuery.grep( arr, function (e) { return e.length > 0; } );
	    arr.shift();
	    if(arr[0] == "text") {
		var maxlen = 256;
		var dispsize = 8;
		if(arr.length >= 2) maxlen = arr[2];
		if(arr.length >= 3) dispsize = arr[3];
		$(this.id).append('<input type="text" maxlength="'+maxlen+'" size="'+dispsize+'">');
		this.value = function () {
		    return $(this.id + ' input').val();
		}
	    }
	    if(arr[0] == "select") {
		var options = "";
		var maxlen = arr[2];
		for(i=3;i<arr.length;i++) {
		    var opttext;
		    if(arr[i].length > maxlen)
			opttext = ".."+arr[i].substr(arr[i].length - maxlen);
		    else
			opttext = arr[i];
		    options = options + '<option value="'+arr[i]+'">'+opttext+'</option>';
		}
		$(this.id).append('<select>'+options+'</select>');
		this.value = function () {
		    return $(this.id +' select').val();
		}
	    }
	    if(arr[0] == "checkbox") {
		var options = "";
		var maxlen = arr[2];
		for(i=3;i<arr.length;i++) {
		    var opttext;
		    if(arr[i].length > maxlen)
			opttext = ".."+arr[i].substr(arr[i].length - maxlen);
		    else
			opttext = arr[i];
		    options = options + '<br>&nbsp;<input type="checkbox" value="'+arr[i]+'">'+opttext;
		}
		$(this.id).append(options);
		this.value = function () {
		    var values;
		    var val="";
		    values = $(this.id +' input');
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
		for(i=3;i<arr.length;i++) {
		    var opttext;
		    if(arr[i].length > maxlen)
			opttext = ".."+arr[i].substr(arr[i].length - maxlen);
		    else
			opttext = arr[i];
		    options = options + '<br>&nbsp;<input type="radio" name="'+this.container+this.n+'"value="'+arr[i]+'">'+opttext;
		}
		$(this.id).append(options);
		this.value = function () {
		    var values;
		    var val="";
		    values = $(this.id +' input');
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
	if($(this.id).length == 0) {
	    $('#'+this.container).append('<tr><td class="param" id="'+this.n+'">AAAA'+this.n+'</td></tr>');
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
    
    this.edit = 0;
    this.name = name;
    this.nicename = name;
    this.justcreated = 0;
    this.adminroles = '';
    this.admin = "0";
    this.params = [];
    this.files = [];
    this.serial = 'no';
    this.pollcounter = 0;
    this.pollnow = 0;
    this.ajax = function (url, context, callback) {
	$.ajax({
            url: url,
            type: 'GET',
            dataType: 'text',
            success: callback,
	    context: context
	});
    };
    this.editmode = function (mode) {
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
	$('#jobname_'+this.name).empty();
	if(this.edit) {
	    $('#jobname_'+this.name).append('<input type="text" value="'+this.nicename+'">');
	    this.nicename_value = function () {
		return $('#jobname_'+this.name+' input').val();
            }
	    return;
	}
	$('#jobname_'+this.name).append(this.nicename);
    }
    this.roles_display = function () {
	$('#roles_'+this.name).empty();
	if(this.edit) {
	    $('#roles_'+this.name).append('Roles:<br><textarea  cols=10 rows=5>'+this.roles+'</textarea>');
	    this.roles_value = function () {
		return $('#roles_'+this.name+' textarea').val();
	    }
	}
    }
    this.adminroles_display = function () {
	$('#adminroles_'+this.name).empty();
	if(this.edit) {
	    $('#adminroles_'+this.name).append('Admin roles:<br><textarea  cols=10 rows=5>'+this.adminroles+'</textarea>');
	    this.adminroles_value = function () {
		return $('#adminroles_'+this.name+' textarea').val();
	    }
	}
    }
    this.tags_display = function () {
	$('#tags_'+this.name).empty();
	if(this.edit) {
	    $('#tags_'+this.name).append('Tags:<br><textarea  cols=10 rows=5>'+this.tags+'</textarea>');
	    this.tags_value = function () {
		return $('#tags_'+this.name+' textarea').val();
	    }
	}
    }
    this.serial_display = function () {
	$('#serial_'+this.name).empty();
	if(this.edit) {
	    if(this.serial == 'yes')
		$('#serial_'+this.name).append('serial:<br><input type="checkbox" value="'+this.serial+'" checked>');
	    else
		$('#serial_'+this.name).append('serial:<br><input type="checkbox" value="'+this.serial+'">');
	    this.serial_value = function () {
		values = $('#serial_'+this.name+' input');
		if(values[0].checked) return 'yes';
		return 'no';
	    }
	}
    }
    this.description_display = function () {
	$('#description_'+this.name).empty();
	if(this.edit) {
	    $('#description_'+this.name).append('Description:<br><textarea  cols=60 rows=15>'+this.description+'</textarea>');
	    this.description_value = function () {
		return $('#description_'+this.name+' textarea').val();
	    };
	} else {
	    $('#description_'+this.name).append(this.description);
	}
    }
    this.param_add = function () {
	param = new Param("params_"+this.name, this.params.length+1, "Caption:");
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
	    if($('#paramadd_'+this.name).length == 0) {
		$("#params_"+this.name).append('<button type="button" id="paramadd_'+this.name+'">Add parameter</button>');
		$('#paramadd_'+this.name).click(this, function(event) {
		    event.data.param_add();
		});
	    }
	} else {
	    $('#paramadd_'+this.name).remove();
	}
    }
    this.message_display = function (msg) {
	$('#msg_'+this.name).empty();
	$('#msg_'+this.name).append('<b>'+msg+'</b>');
    }

    this.run_cb = function (text,status,xhr) {
	$('#msg_'+this.name).empty();
	if(text.length > 8) new Log(text);
    }
    this.update_cb = function (text,status,xhr) {
	$('#msg_'+this.name).empty();
	this.editmode(0);
	this.justcreated = 0;
	this.display();
	this.read();
    }
    this.delete_cb = function (text,status,xhr) {
	$('#job_'+this.name).remove();
	$('#jobdata_'+this.name).remove();
	jobs[this.name] = undefined;
	if(this.timer != undefined) clearInterval(this.timer);
    }
    
    this.run_ecb = function (xhr,status,text) {
	this.message_display("ERR: " + xhr.status +  " " + text);
    }
    
    this.run_display = function () {
	$('#run_'+this.name).empty();
	if(this.edit) {
	    $('#run_'+this.name).append('Script<br><textarea  cols=60 rows=15>'+this.run+'</textarea>');
	    $('#run_'+this.name).append('<button type="button" id="runlink_'+this.name+'">Save</button>');
	    this.run_value = function () {
		return $('#run_'+this.name+' textarea').val();
	    };
	    $('#runlink_'+this.name).click(this, function(event) {
		var params = {};
		var i;
		params['nicename'] = event.data.nicename_value();
		for(i=0;i<event.data.params.length;i++) {
		    params['param'+event.data.params[i].n] = event.data.params[i].value();
		}
		params['description'] = event.data.description_value();
		params['tags'] = event.data.tags_value();
		params['serial'] = event.data.serial_value();
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
	    $('#run_'+this.name).append('<button type="button" id="runlink_'+this.name+'">Run</button>');
	    $('#runlink_'+this.name).click(this, function(event) {
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
	}
    }

    this.edit_display = function () {
	$('#jobedit_'+this.name).empty();
	if(this.edit) {
	    $('#jobedit_'+this.name).append('<img WIDTH=18 HEIGHT=18 id="jobeditmode_'+this.name+'" src="'+
					    baseurl+'close.png">'+
					    '&nbsp;&nbsp;&nbsp;<img WIDTH=18 HEIGHT=22 id="jobdelete_'+this.name+'" src="'+
					    baseurl+'trashcan.png">'
					   );
	    $('#jobeditmode_'+this.name).click(this, function(event) {
		event.data.editmode(0);
		event.data.display();
	    });
	    $('#jobdelete_'+this.name).click(this, function(event) {
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
		$('#jobedit_'+this.name).append('<img WIDTH=18 HEIGHT=18 id="jobeditmode_'+this.name+'" src="'+baseurl+'pencil.png">');
		$('#jobeditmode_'+this.name).click(this, function(event) {
		    event.data.editmode(1);
		    event.data.display();
		    event.data.message_display('');
		});
	    }
	}
    }

    this.sendfile = function (formdata, name) {
	this.postfile(baseurl + "_file/" + this.name + "/put/"+name,
			this,
			this.read_files,
			formdata);
    }

    this.files_display = function () {
	$('#files_'+this.name).empty();
	if(this.edit) {
	    $('#files_'+this.name).append('Files:<table>');
	    for(i=0;i<this.files.length;i++) {
		$('#files_'+this.name).append('<tr class="files"><td>'+this.files[i]+'</td><td><img WIDTH=18 HEIGHT=18 id="filedel_'+ this.name + '_' + i +'" src="'+baseurl+'close.png"></td></tr>');
		$('#filedel_'+ this.name + '_' + i).click({ job: this, n: i }, function(event) {
		    if(confirm("Delete file " + event.data.job.files[event.data.n] + "?")) {
			event.data.job.ajax(baseurl + "_file/" + event.data.job.name + "/del/" + event.data.job.files[event.data.n] , event.data.job, event.data.job.read_files);
		    }
		});
	    }
	    $('#files_'+this.name).append('</table>');
	    $('#files_'+this.name).append('<form method="post" enctype="multipart/form-data"><label for="file">Upload file:</label><input type="file" name="file" id="file"><br><button type="button" name="submit">Upload</button></form>');
	    $('#files_'+this.name+' button').click(this, function(event){
		var fileInput = $('#files_'+event.data.name+' input')[0];
		var file = fileInput.files[0];
		var formData = new FormData();
		formData.append('file', file);
		event.data.sendfile(formData, file.name);
	    });
	}
    }

    this.history_display = function () {
	var i, elem, anim;
	var loginfo, logname, logstatus;

	$('#history_'+this.name).empty();
	for(i=0;i<this.logs.length;i++) {
	    loginfo = this.logs[i].split(' ');
	    logname = loginfo[0];
	    logstatus = loginfo[1];
	    if(logstatus == "r")
		anim = 'class="running"';
	    else
		anim = "";
	    elem = $('#history_'+this.name).append('<tt '+anim+' id="hist_'+this.name+'_'+i+'">'+logname+"<br></tt>");
	    if(logstatus == "0")
		$('#hist_'+this.name+'_'+i).css("background-color","lightgreen");
            else {
		if(logstatus != "r")
		    $('#hist_'+this.name+'_'+i).css("background-color","#faa");
	    }
	    
	    $('#hist_'+this.name+'_'+i).click(logname, function(event) {
		new Log(event.data);
	    });

	    $('#hist_'+this.name+'_'+i).on("mouseover mouseout", function(event) {
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
	}
    }

    this.param_cb = function (text,status,xhr) {
	var param;
	this.job.ajax(baseurl + "_exe/" + this.job.name + "/param" + (this.attr +1), { job: this.job, attr: (this.attr+1) }, this.job.param_cb);
	for(i=0;i<this.job.params.length;i++) {
	    if(this.job.params[i].n == this.attr) {
		param = this.job.params[i];
		param.def = text;
		break;
	    }
	}
	if(param === undefined) {
	    param = new Param("params_"+this.job.name, this.attr, text);
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
    }
    
    this.history_cb = function (text,status,xhr) {
	if(this.logs) {
	    for(i=0;i<this.logs.length;i++) {
		$('#hist_'+this.name+'_'+i).off('click mouseover mouseout');
	    }
	}
	this.logs = text.split('\n').filter(function (e) {if(e.length >0) return true;return false;});
	this.history_display();
    }

    this.files_cb = function (text,status,xhr) {
	this.files = text.split('\n').filter(function (e) {if(e.length >0) return true;return false;});
	this.files_display();
    }

    this.read_attr = function (attr) {
	this.ajax(baseurl + "_exe/" + this.name + "/" + attr, { job: this, attr: attr }, this.attr_cb);
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
	this.description_display();
	if(this.edit) 
	    this.read_files();
	else
	    this.files_display();
    }
    this.read = function () {
	this.framework_create();
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
    };

    this.drop = function (data) {
	var src, i;
	src = jobs[data];
	if(this.edit) {
	    $('#description_'+this.name+' textarea').val(src.description);
	    $('#adminroles_'+this.name+' textarea').val(src.adminroles);
	    $('#roles_'+this.name+' textarea').val(src.roles);
	    $('#tags_'+this.name+' textarea').val(src.tags);
	    $('#run_'+this.name+' textarea').val(src.run);
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
		this.params.unshift(src.params[i].copy("params_"+this.name, i+1));
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
	if ($('#job_'+this.name).length == 0) {
	    $('#items').append('<tr class="jobrow" id="job_' +
			       this.name +
			       '"><td COLSPAN=2>' +
			       '<img WIDTH=18 HEIGHT=18 id="jobtoggle_'+this.name+'" src="'+baseurl+'plus.png">&nbsp;' +
			       '<span draggable="true" class="name" id="jobname_' + this.name + '">'+this.name+'</span>&nbsp;' +
			       '<span class="name" id="jobedit_' + this.name + '"></span>&nbsp;' +
			       '</td>' +
			       '</tr><tr class="jobrow" id="jobdata_' +
			       this.name + '">' +
			       '<td valign=top><table border="0">' + 
			       '<tr><td class="desc" id="description_' + this.name + '"></td></tr>' +
			       '<tr><td id="adminroles_' + this.name + '"></td></tr>' +
			       '<tr><td id="roles_' + this.name + '"></td></tr>' +
			       '<tr><td id="tags_' + this.name + '"></td></tr>' +
			       '<tr><td id="serial_' + this.name + '"></td></tr>' +
			       '</table></td>' +
			       '<td valign=top NOWRAP><table border="0" id="params_'+this.name+'"></table>' + 
			       '<table border="0">' + 
			       '<tr><td class="message" id="msg_' + this.name + '"></td></tr>' +
			       '</table></td>' +
			       '<td valign=top ><table border="0">' + 
			       '<tr><td valign=top id="files_' + this.name + '"></td></tr>' +
			       '<tr><td valign=top class="run" id="run_' + this.name + '"></td></tr>' +
			       '</table></td>' +
			       '<td valign=top class="history" id="history_' + this.name + '">logg historik</td>' +
			       '</tr>');
	    var job = this;
	    $('#jobname_'+this.name).bind('dragstart', function(event) {
		/* use variable, since bind's this is the global context */
		event.originalEvent.dataTransfer.setData("text/plain",job.name);
	    });
	    $('#jobname_'+this.name).bind('dragover', function(event) {
		event.originalEvent.stopPropagation();
		event.originalEvent.preventDefault();
	    });
	    $('#jobname_'+this.name).bind('dragenter', function(event) {
		event.originalEvent.stopPropagation();
		event.originalEvent.preventDefault();
	    });
	    $('#jobname_'+this.name).bind('drop', function(event) {
		event.originalEvent.stopPropagation();
		event.originalEvent.preventDefault();
		job.drop(event.originalEvent.dataTransfer.getData("text/plain"));
	    });
	    $('#jobtoggle_'+this.name).click(this, function(event) {
                $('#jobdata_'+event.data.name).toggle(30);
		if(localStorage[event.data.name+'.'+'hide'] == 1)
		    localStorage[event.data.name+'.'+'hide'] = 0;
		else
		    localStorage[event.data.name+'.'+'hide'] = 1;
            });
	    if(localStorage[this.name+'.'+'hide'] === undefined) {
		$('#jobdata_'+this.name).hide();
		localStorage[this.name+'.'+'hide'] = 1;
	    } else {
		if(localStorage[this.name+'.'+'hide'] == 0)
		    $('#jobdata_'+this.name).hide();
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
    
    for(i=0;i<arr.length;i++) {
	if(arr[i].length < 2) continue;
	new Job(arr[i]);
    }
}

function gotroles(text) {
    $("#roles").empty();
    $("#roles").append('<img WIDTH=18 HEIGHT=18 src="'+baseurl+'key.png">' + text);
    roles = text.split('\n');
}

function gottags(text) {
    var arr = text.split('\n');
    var curtags = pathinfo.split('/');

    curtags = curtags.filter(function (e) {if(e.length >0) return true;return false;});

    $("#tags").append("Tags: ");

    for(i=0;i<arr.length;i++) {
	if(arr[i].length < 2) continue;
	if($.inArray(arr[i], curtags) >= 0) {
	    pathv = curtags.filter(function (e) {if(e == arr[i]) return false;return true;});
	    path = pathv.join('/');
	    linkname = "<b>"+arr[i]+"</b>";
	} else {
	    if(pathinfo.length > 1)
		path = pathinfo.substr(1) + "/" + arr[i];
	    else
		path = arr[i];
	    linkname = arr[i];
	}
	$("#tags").append('<a href="'+baseurl+"kp/"+path+'">'+linkname+'</a> ');
    }
}

$(function () {
    baseurl = $("#user").attr("baseurl") + "/";
    username = $("#user").attr("username");
    pathinfo = $("#user").attr("pathinfo");
    var curtags = pathinfo.split('/');
    curtags = curtags.filter(function (e) {if(e.length >0) return true;return false;});
    nonce = $("#user").attr("nonce");
    createjob = $("#user").attr("createjob");
    if(curtags.length) {
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
	    job=new Job(username+'-'+Math.round((d.getTime()/1000)-1363361021));
	    job.edit = 1;
	    job.justcreated = 1;
	    job.description = 'What this job does';
	    job.roles = roles.join('\n');
	    job.adminroles = roles[0];
	    job.run = '';
	    job.tags = '';
	    job.display();
	});
    }
});

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

	$('#logtime_'+this.id).empty();
	if(this.end >= this.start) {
	    timestring = ((this.end-this.start)+"").toHHMMSS();
	    $('#logtime_'+this.id).append(" Runtime: " + timestring);
	} else {
	    timestring = (Math.ceil(($.now()/1000)-this.start)+"").toHHMMSS();
	    $('#logtime_'+this.id).append(" Runtime: " + timestring);
	}
    };
    
    this.status_display = function () {
	$('#logstatus_'+this.id).empty();
	$('#logstatus_'+this.id).append(" Status: " + this.status);
	if(this.status == "0")
	    $('#logstatus_'+this.id).css("background-color","lightgreen");
	else
	    $('#logstatus_'+this.id).css("background-color","#f88");
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
	if ($('#log_'+this.id).length == 0) {
	    $('#logs').prepend('<table border=0 class="logtable" id="log_' + this.id +
			       '"><tr><td COLSPAN=3 >' +
			       '<img WIDTH=18 HEIGHT=18 id="logdel_'+ this.id +'" src="'+baseurl+'close.png">' +
			       '<img WIDTH=18 HEIGHT=18 id="logtoggle_'+ this.id +'" src="'+baseurl+'plus.png">&nbsp;' +
			       this.name +
			       '</td></tr><tr><td id="logtime_' + this.id +
			       '"></td><td id="logstatus_' + this.id +
			       '"></td><td><a href="' + baseurl+ '_log/' +this.name +
			       '"><img WIDTH=18 HEIGHT=18 src="'+baseurl+'download.png"></a>' +
			       '</td></tr><tr><td COLSPAN=3 >' +
			       '<textarea readonly class="log" wrap=off cols=40 rows=35 id="logdata_' +
			       this.id +
			       '"></textarea></td></tr></table>'
			      );
	    $('#logdel_'+this.id).click(this, function(event) {
		event.data.remove();
	    });
	    $('#logtoggle_'+this.id).click(this, function(event) {
		$('#logdata_'+event.data.id).toggle(30);
	    });
	}
    }

    this.lengthInUtf8Bytes = function(str) {
    // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
	var m = encodeURIComponent(str).match(/%[89ABab]/g);
	return str.length + (m ? m.length : 0);
    }
    
    this.poll_cb = function (text,status,xhr) {
	$('#logdata_'+this.id).append(text);
	this.pos += this.lengthInUtf8Bytes(text);
	$('#logdata_'+this.id)[0].scrollTop=$('#logdata_'+this.id)[0].scrollHeight;
    }
    
    this.poll = function() {
	this.read();
	this.ajax(baseurl + "_log/" + this.name + "?start="+this.pos, this, this.poll_cb);
    }

    this.remove = function() {
	if(this.timer != undefined) clearInterval(this.timer);
	$('#log_'+this.id).empty();
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
	    $('#run_'+this.name).append('<button type="button" id="runlink_'+this.name+'">Update</button>');
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
	    $('#hist_'+this.name+'_'+i).live('mouseover mouseout', function(event) {
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
	if(this.attr == "admin") {
	    this.job.admin = text;
	    this.job.edit_display();
	}
    }
    
    this.history_cb = function (text,status,xhr) {
	this.logs = text.split('\n').filter(function (e) {if(e.length >0) return true;return false;});
	this.history_display();
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
    this.display = function () {
	this.nicename_display();
	this.params_display();
	this.edit_display();
	this.run_display();
	this.roles_display();
	this.adminroles_display();
	this.tags_display();
	this.description_display();
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
	this.read_attr("admin");
	this.read_history();
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
			       '</table></td>' +
			       '<td valign=top NOWRAP><table border="0" id="params_'+this.name+'"></table>' + 
			       '<table border="0">' + 
			       '<tr><td class="message" id="msg_' + this.name + '"></td></tr>' +
			       '</table></td>' +
			       '<td valign=top class="run" id="run_' + this.name + '"></td>' +
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
	    var i=1;
	    while(jobs[username+'-'+i] !== undefined)
		i=i+1;
	    job=new Job(username+'-'+i);
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

/*
 * Implements the javascript frontend of 'kp'.
 *
 * Copyright: Jens Låås, UU 2012
 * Copyright license: According to GPL, see file LICENSE in this directory.
 */
var baseurl;
var glob_logid = 0;
var jobs = [ ];
var logs = [ ];

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
function log_new(name) {
    var log, i;

    if(logs[name]) {
	return undefined;
    }

    log = {};
    glob_logid += 1;
    log.id = glob_logid;
    log.name = name;
    log.pos = 0;
    log.start = 0;
    log.end = 0;
    log.pollstop = 0;
    logs[ log.name ] = log;

    log.ajax = function (url, context, callback) {
	$.ajax({
            url: url,
            type: 'GET',
            dataType: 'text',
            success: callback,
	    context: context
	});
    };
    log.read_attr = function (attr) {
	this.ajax(baseurl + "_log/" + this.name + "/" + attr, { log: this, attr: attr }, this.attr_cb);
    };
    
    log.time_display = function () {
	$('#logtime_'+this.id).empty();
	if(this.end >= this.start) {
	    $('#logtime_'+this.id).append(" Runtime: " + (this.end-this.start)+'s');
	} else {
	    $('#logtime_'+this.id).append(" Runtime: " + Math.ceil(($.now()/1000)-this.start) +'s');
	}
    };
    
    log.status_display = function () {
	$('#logstatus_'+this.id).empty();
	$('#logstatus_'+this.id).append(" Status: " + this.status);
	if(this.status == "0")
	    $('#logstatus_'+this.id).css("background-color","lightgreen");
	else
	    $('#logstatus_'+this.id).css("background-color","#f88");
    };
    
    log.attr_cb = function (text,status,xhr) {
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

    log.read = function () {
	this.framework_create();
	this.read_attr("start");
	this.read_attr("end");
	this.read_attr("status");
    }

    log.framework_create = function () {
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
    
    log.poll_cb = function (text,status,xhr) {
	$('#logdata_'+this.id).append(text);
	this.pos += text.length;
	$('#logdata_'+this.id)[0].scrollTop=$('#logdata_'+this.id)[0].scrollHeight;
    }
    
    log.poll = function() {
	log.read();
	this.ajax(baseurl + "_log/" + this.name + "?start="+this.pos, this, this.poll_cb);
    }

    log.remove = function() {
	if(this.timer != undefined) clearInterval(this.timer);
	$('#log_'+this.id).empty();
	logs[this.name] = undefined;
    }

    log.read();

    log.timer = setInterval(function(){
	log.poll();
    }, 5000);
    
    return log;
}

/*
  job object constructor.
  Starts ajax calls to fill in job information.
  The callbacks from the ajax calls will record and display job properties.
  Starts a polling function to update the log history.
  Returns the created job object.
*/
function job_new(name) {
    var job;
    job = {};
    job.name = name;
    job.ajax = function (url, context, callback) {
	$.ajax({
            url: url,
            type: 'GET',
            dataType: 'text',
            success: callback,
	    context: context
	});
    };
    job.post = function (url, context, callback, errorcb, data) {
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
    job.nicename_display = function () {
	$('#jobname_'+this.name).empty();
	$('#jobname_'+this.name).append(this.nicename);
    }
    job.description_display = function () {
	$('#description_'+this.name).empty();
	$('#description_'+this.name).append(this.description);
    }
    job.param_display = function (name, elem, param) {
	var arr = param.split(':');
	elem.append("<b>" + arr[0] + ":</b> ");
	arr = param.substring(param.indexOf(":")).split('\n');
	arr = arr[0].split(' ');
	arr = jQuery.grep( arr, function (e) { return e.length > 0; } );
	arr.shift();
	if(arr[0] == "text") {
	    elem.append('<input type="text" maxlength="8" size="8" name="'+name+'">');
	    this[name+'_value'] = function () {
		return $('#'+name+'_'+this.name+' input').val();
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
	    elem.append('<select name="'+name+'">'+options+'</select>');
	    this[name+'_value'] = function () {
		return $('#'+name+'_'+this.name+' select').val();
	    }
	}
    }
    job.param1_display = function () {
	$('#param1_'+this.name).empty();
	this.param_display("param1", $('#param1_'+this.name), this.param1);
    }
    job.param2_display = function () {
	$('#param2_'+this.name).empty();
	this.param_display("param2", $('#param2_'+this.name), this.param2);
    }
    job.param3_display = function () {
	$('#param3_'+this.name).empty();
	this.param_display("param3", $('#param3_'+this.name), this.param3);
    }
    job.message_display = function (msg) {
	$('#msg_'+this.name).empty();
	$('#msg_'+this.name).append('<b>'+msg+'</b>');
    }

    job.run_cb = function (text,status,xhr) {
	$('#msg_'+this.name).empty();
	if(text.length > 8) log_new(text);
    }
    
    job.run_ecb = function (xhr,status,text) {
	this.message_display("ERR: " + xhr.status +  " " + text);
    }
    
    job.run_display = function () {
	$('#run_'+this.name).empty();
	$('#run_'+this.name).append('<button type="button" id="runlink_'+this.name+'">Run</button>');
	$('#runlink_'+this.name).click(this, function(event) {
	    var params = {};
	    if(event.data['param1_value']) params['param1'] = event.data.param1_value();
	    if(event.data['param2_value']) params['param2'] = event.data.param2_value();
	    if(event.data['param3_value']) params['param3'] = event.data.param3_value();
	    if(confirm("Run "+event.data.name+"?")) {
		event.data.post(baseurl + "_exe/" + event.data.name + "/run",
				event.data,
				event.data.run_cb,
				event.data.run_ecb,
				params);
	    }
	});
    }

    job.history_display = function () {
	var i;
	$('#history_'+this.name).empty();
	for(i=0;i<this.logs.length;i++) {
	    $('#history_'+this.name).append('<tt id="hist_'+this.name+'_'+i+'">'+this.logs[i]+"<br></tt>");
	    $('#hist_'+this.name+'_'+i).click(this.logs[i], function(event) {
		log_new(event.data);
	    });
	}
    }

    job.attr_cb = function (text,status,xhr) {
	if(this.attr == "description") {
	    this.job.description = text;
	    this.job.description_display();
	}
	if(this.attr == "name") {
	    this.job.nicename = text;
	    this.job.nicename_display();
	}
	if(this.attr == "param1") {
	    this.job.param1 = text;
	    this.job.param1_display();
	}
	if(this.attr == "param2") {
	    this.job.param2 = text;
	    this.job.param2_display();
	}
	if(this.attr == "param3") {
	    this.job.param3 = text;
	    this.job.param3_display();
	}
	if(this.attr == "run") {
	    this.job.run = text;
	    this.job.run_display();
	}
    }
    
    job.history_cb = function (text,status,xhr) {
	this.logs = text.split('\n').filter(function (e) {if(e.length >0) return true;return false;});
	this.history_display();
    }

    job.read_attr = function (attr) {
	this.ajax(baseurl + "_exe/" + this.name + "/" + attr, { job: this, attr: attr }, this.attr_cb);
    };
    job.read_history = function () {
	this.ajax(baseurl + "_exe/" + this.name + "/logs" , this, this.history_cb);
    };
    job.read = function () {
	this.framework_create();
	this.read_attr("description");
	this.read_attr("name");
	this.read_attr("param1");
	this.read_attr("param2");
	this.read_attr("param3");
	this.read_attr("run");
	this.read_history();
    };
    
    job.framework_create = function () {
	if ($('#job_'+this.name).length == 0) {
	    $('#items').append('<tr class="jobrow" id="job_' +
			       this.name +
			       '"><td COLSPAN=2>' +
			       '<img WIDTH=18 HEIGHT=18 id="jobtoggle_'+this.name+'" src="'+baseurl+'plus.png">&nbsp;' +
			       '<span class="name" id="jobname_' + this.name + '">'+this.name+'</span></td>' +
			       '</tr><tr class="jobrow" id="jobdata_' +
			       this.name + '">' +
			       '<td valign=top class="desc" id="description_' + this.name + '"></td>' +
			       '<td NOWRAP><table border="0">' + 
			       '<tr><td class="param" id="param1_' + this.name + '"></td></tr>' +
			       '<tr><td class="param" id="param2_' + this.name + '"></td></tr>' +
			       '<tr><td class="param" id="param3_' + this.name + '"></td></tr>' +
			       '<tr><td class="message" id="msg_' + this.name + '"></td></tr>' +
			       '</table></td>' +
			       '<td class="run" id="run_' + this.name + '"></td>' +
			       '<td valign=top class="history" id="history_' + this.name + '">logg historik</td>' +
			       '</tr>');
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


    job.poll = function() {
	this.read_history();
    };

    job.timer = setInterval(function(){
	job.poll();
    }, 5000);

    return job;
}

function gotlist(text) {
    var arr = text.split('\n');
    var job;
    
    for(i=0;i<arr.length;i++) {
	if(arr[i].length < 2) continue;
	job = job_new(arr[i]);
	jobs[job.name] = job;
	job.read();
    }
}

function gotroles(text) {
    $("#roles").empty();
    $("#roles").append('<img WIDTH=18 HEIGHT=18 src="'+baseurl+'key.png">' + text);
}

function gottags(text) {
    var arr = text.split('\n');

    $("#tags").append("Tags: ");

    for(i=0;i<arr.length;i++) {
	if(arr[i].length < 2) continue;
	$("#tags").append('<a href="'+arr[i]+'">'+arr[i]+'</a> ');
    }
}

$(function () {
    baseurl = $("#user").attr("baseurl") + "/";
    username = $("#user").attr("username");
    pathinfo = $("#user").attr("pathinfo");
    $.get(baseurl + "_view" + pathinfo,
	  function(text, status, xhr) { gotlist(text); },
	  "text");
    $.get(baseurl + "_auth/" + username,
	  function(text, status, xhr) { gotroles(text); },
	  "text");
    $.get(baseurl + "_tags",
	  function(text, status, xhr) { gottags(text); },
	  "text");
});

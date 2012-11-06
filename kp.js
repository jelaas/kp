/*
 * Implements the javascript frontend of 'kp'.
 *
 * Copyright: Jens Låås, UU 2012
 * Copyright license: According to GPL, see file LICENSE in this directory.
 */
var baseurl, username;
var glob_logid = 0;
var jobs = { };
var logs = [ ];
var roles = [ ];

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

    log.poll();

    log.timer = setInterval(function(){
	log.poll();
    }, 2000);
    
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
    
    if(jobs[name])
	return undefined;
    
    jobs[name] = job;
    
    job.edit = 0;
    job.name = name;
    job.nicename = name;
    job.justcreated = 0;
    job.adminroles = '';
    job.admin = "0";
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
	if(this.edit) {
	    $('#jobname_'+this.name).append('<input type="text" value="'+this.nicename+'">');
	    this.nicename_value = function () {
		return $('#jobname_'+this.name+' input').val();
            }
	    return;
	}
	$('#jobname_'+this.name).append(this.nicename);
    }
    job.roles_display = function () {
	$('#roles_'+this.name).empty();
	if(this.edit) {
	    $('#roles_'+this.name).append('Roles:<br><textarea  cols=10 rows=5>'+this.roles+'</textarea>');
	    this.roles_value = function () {
		return $('#roles_'+this.name+' textarea').val();
	    }
	}
    }
    job.adminroles_display = function () {
	$('#adminroles_'+this.name).empty();
	if(this.edit) {
	    $('#adminroles_'+this.name).append('Admin roles:<br><textarea  cols=10 rows=5>'+this.adminroles+'</textarea>');
	    this.adminroles_value = function () {
		return $('#adminroles_'+this.name+' textarea').val();
	    }
	}
    }
    job.tags_display = function () {
	$('#tags_'+this.name).empty();
	if(this.edit) {
	    $('#tags_'+this.name).append('Tags:<br><textarea  cols=10 rows=5>'+this.tags+'</textarea>');
	    this.tags_value = function () {
		return $('#tags_'+this.name+' textarea').val();
	    }
	}
    }
    job.description_display = function () {
	$('#description_'+this.name).empty();
	if(this.edit) {
	    $('#description_'+this.name).append('Description:<br><textarea  cols=60 rows=15>'+this.description+'</textarea>');
	    this.description_value = function () {
		return $('#description_'+this.name+' textarea').val();
	    }
	} else {
	    $('#description_'+this.name).append(this.description);
	}
    }
    job.param_display = function (name, elem, param) {
	if(this.edit) {
	    var val = "";
	    if(this[name]!==undefined)
		val = this[name];
	    elem.append(name + '<br><textarea  cols=20 rows=5>'+val+'</textarea>');
	    this[name+'_value'] = function () {
		return $('#'+name+'_'+this.name+' textarea').val();
	    }
	} else {
	    if(param === undefined) return;
	    var arr = param.split(':');
	    elem.append("<b>" + arr[0] + ":</b> ");
	    arr = param.substring(param.indexOf(":")).split('\n');
	    arr = arr[0].split(' ');
	    arr = jQuery.grep( arr, function (e) { return e.length > 0; } );
	    arr.shift();
	    if(arr[0] == "text") {
		elem.append('<input type="text" maxlength="8" size="8">');
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
		elem.append('<select>'+options+'</select>');
		this[name+'_value'] = function () {
		    return $('#'+name+'_'+this.name+' select').val();
		}
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
    job.update_cb = function (text,status,xhr) {
	$('#msg_'+this.name).empty();
	this.edit = 0;
	this.justcreated = 0;
	this.display();
	this.read();
    }
    job.delete_cb = function (text,status,xhr) {
	$('#job_'+this.name).empty();
	$('#jobdata_'+this.name).empty();
	jobs[this.name] = undefined;
    }
    
    job.run_ecb = function (xhr,status,text) {
	this.message_display("ERR: " + xhr.status +  " " + text);
    }
    
    job.run_display = function () {
	$('#run_'+this.name).empty();
	if(this.edit) {
	    $('#run_'+this.name).append('Script<br><textarea  cols=60 rows=15>'+this.run+'</textarea>');
	    $('#run_'+this.name).append('<button type="button" id="runlink_'+this.name+'">Update</button>');
	    this.run_value = function () {
		return $('#run_'+this.name+' textarea').val();
	    };
	    $('#runlink_'+this.name).click(this, function(event) {
		var params = {};
		params['nicename'] = event.data.nicename_value();
		params['param1'] = event.data.param1_value();
		params['param2'] = event.data.param2_value();
		params['param3'] = event.data.param3_value();
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
    }

    job.edit_display = function () {
	$('#jobedit_'+this.name).empty();
	if(this.edit) {
	    $('#jobedit_'+this.name).append('<img WIDTH=18 HEIGHT=18 id="jobeditmode_'+this.name+'" src="'+
					    baseurl+'close.png">'+
					    '&nbsp;&nbsp;&nbsp;<img WIDTH=18 HEIGHT=22 id="jobdelete_'+this.name+'" src="'+
					    baseurl+'trashcan.png">'
					   );
	    $('#jobeditmode_'+this.name).click(this, function(event) {
		event.data.edit = 0;
		event.data.display();
	    });
	    $('#jobdelete_'+this.name).click(this, function(event) {
		event.data.post(baseurl + "_exe/" + event.data.name + "/delete",
				event.data,
				event.data.delete_cb,
				event.data.run_ecb,
				{});
	    });
	} else {
	    if(this.admin == "1") {
		$('#jobedit_'+this.name).append('<img WIDTH=18 HEIGHT=18 id="jobeditmode_'+this.name+'" src="'+baseurl+'pencil.png">');
		$('#jobeditmode_'+this.name).click(this, function(event) {
		    event.data.edit = 1;
		    event.data.display();
		});
	    }
	}
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
    job.display = function () {
	this.nicename_display();
	this.param1_display();
	this.param2_display();
	this.param3_display();
	this.edit_display();
	this.run_display();
	this.roles_display();
	this.adminroles_display();
	this.tags_display();
	this.description_display();
    }
    job.read = function () {
	this.framework_create();
	this.read_attr("description");
	this.read_attr("name");
	this.read_attr("param1");
	this.read_attr("param2");
	this.read_attr("param3");
	this.read_attr("run");
	this.read_attr("roles");
	this.read_attr("adminroles");
	this.read_attr("tags");
	this.read_attr("admin");
	this.read_history();
	this.edit_display();
    };
    
    job.framework_create = function () {
	if ($('#job_'+this.name).length == 0) {
	    $('#items').append('<tr class="jobrow" id="job_' +
			       this.name +
			       '"><td COLSPAN=2>' +
			       '<img WIDTH=18 HEIGHT=18 id="jobtoggle_'+this.name+'" src="'+baseurl+'plus.png">&nbsp;' +
			       '<span class="name" id="jobname_' + this.name + '">'+this.name+'</span>&nbsp;' +
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

    job.read();
    return job;
}

function gotlist(text) {
    var arr = text.split('\n');
    
    for(i=0;i<arr.length;i++) {
	if(arr[i].length < 2) continue;
	job_new(arr[i]);
    }
}

function gotroles(text) {
    $("#roles").empty();
    $("#roles").append('<img WIDTH=18 HEIGHT=18 src="'+baseurl+'key.png">' + text);
    roles = text.split('\n');
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
    createjob = $("#user").attr("createjob");
    $.get(baseurl + "_view" + pathinfo,
	  function(text, status, xhr) { gotlist(text); },
	  "text");
    $.get(baseurl + "_auth/" + username,
	  function(text, status, xhr) { gotroles(text); },
	  "text");
    $.get(baseurl + "_tags",
	  function(text, status, xhr) { gottags(text); },
	  "text");
    if(createjob == "1") {
	$("#createjob").append('<img WIDTH=18 HEIGHT=18 src="'+baseurl+'/blueplus.png" id="createbutton">');
	$('#createbutton').click(this, function(event) {
	    i=1;
	    while(jobs[username+'-'+i] !== undefined)
		i=i+1;
	    job=job_new(username+'-'+i);
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

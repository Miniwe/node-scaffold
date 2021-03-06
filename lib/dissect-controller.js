'use strict';

(function()
{
	var fs = require('fs')
	  , ct = require('./constants')
	  , ejs = require('ejs')
	  , inflection = require('inflection');

	var DissectController = function(scaffold)
	{
		this.scaffold = scaffold;

		this.fields;

		this.nameSingular;
		this.nameSingularCap;
		this.namePlural;
		this.namePluralCap;
	}

	DissectController.prototype =
	{
		dissect : function(model)
		{
			this.nameSingular = inflection.singularize(model.name.toLowerCase());
			this.namePlural = inflection.pluralize(model.name.toLowerCase());
			this.nameSingularCap = inflection.camelize(this.nameSingular);
			this.namePluralCap = inflection.camelize(this.namePlural);

			this.fields = model.fields;

			var path = "./controllers/" + this.nameSingular + ".js";

			if(fs.existsSync(path) && !this.scaffold.config.overwrite)
			{
				this.scaffold.message('Controller \'' + this.nameSingular + '\' already exists! Use --force-overwrite or -F', ct.MSG_FAILED);
			}
			else
			{
				var buf;

				switch(this.scaffold.config.httpFramework)
				{
				case ct.HF_EXPRESS:
					buf = this.bufferForExpress(model);
					break;
				}

				var that = this;

				fs.writeFile(path, buf, function(err,data)
				{
					if(err)
					{
						that.scaffold.message('Error writing file (Skipping): ' + err, ct.MSG_ERROR);
					}
					else
					{
						that.scaffold.message('Controller \'' + that.nameSingularCap + '\' created!', ct.MSG_SUCCESS);
					}
				});
			}
		},

		bufferForExpress : function(model)
		{
			var buf = "";

			buf += "/*\n * EXTENSIONS\n */\n";

			buf += "var jade = require('jade')\n";
			buf += "	, async = require('async')\n";
			buf += "	, " + this.nameSingular + "Model = require('../models/" + this.nameSingular + ".js');\n\n";

			buf += "/*\n * MODELS\n */\n";

			buf += "var " + this.nameSingularCap + " = " + this.nameSingular + "Model.get" + this.nameSingularCap + "();\n\n";

			buf += this.dissectMethods();

			return buf;
		},

		bufferForExpressUsingEJS : function(model)
		{
			var buf = "";

			var file = __dirname + '/tmpl/controller.ejs';
			var str = fs.readFileSync(file, 'utf8');

			buf = ejs.render(str, { model : model });

			return buf;
		},

		dissectMethods : function()
		{
			var buf = "";

			buf += this.createForm();
			buf += this.create();
			buf += this.createInternForm();
			buf += this.createIntern();
			buf += this.getSingle();
			buf += this.getAll();
			buf += this.updateForm();
			buf += this.update();
			buf += this.delete();
			buf += this.deleteIntern();

			return buf;
		},

		getAll : function()
		{
			var buf = "";

			// GET ALL
			buf += "/*\n * [GET] GET ALL ENTRIES FOR " + this.nameSingularCap + "\n *\n";
			buf += " * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

			buf += "exports.get" + this.namePluralCap + " = function(req, res)\n";
			buf += "{\n";
			buf += "	var status = 200;\n";
			buf += "	var format = (req.query.format != null) ? req.query.format : 'html';\n\n";
			buf += "	var " + this.namePlural + " = null;\n\n";

			buf += "	async.series([\n\n";

			// LOAD FROM DATABASE
			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			" + this.nameSingularCap + "\n";
			buf += "			.find()\n";
			buf += "			.exec(function(err, retData)\n";
			buf += "			{\n";
			buf += "				" + this.namePlural + " = retData;\n\n";
			buf += "				callback()\n";
			buf += "			});\n";
			buf += "		}\n\n";
			buf += "	], function(invalid)\n";
			buf += "	{\n";
			buf += "		if(format == 'json')\n";
			buf += "			res.status(status).send(" + this.namePlural + ");\n";
			buf += "		else\n";
			buf += "			res.status(status).render('" + this.nameSingular + "/get-all', { " + this.namePlural + " : " + this.namePlural + " });\n";
			buf += "	});\n";
			buf += "};\n\n";

			return buf;
		},

		getSingle : function()
		{
			var buf = "";

			// GET SINGLE
			buf += "/*\n * [GET] GET SINGLE ENTRY FOR " + this.nameSingularCap + "\n *\n";
			buf += " * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

			buf += "exports.get" + this.nameSingularCap + " = function(req, res)\n";
			buf += "{\n";
			buf += "	var id = req.params.id;\n";
			buf += "	var status = 200;\n";
			buf += "	var format = (req.query.format != null) ? req.query.format : 'html';\n\n";
			buf += "	var " + this.nameSingular + " = null;\n\n";

			buf += "	async.series([\n\n";

			// LOAD FROM DATABASE
			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			" + this.nameSingularCap + "\n";
			buf += "			.findOne({ _id : id })\n";
			buf += "			.exec(function(err, retData)\n";
			buf += "			{\n";
			buf += "				if(retData == null)\n";
			buf += "				{\n";
			buf += "					status = 400;\n";
			buf += "					callback(true);\n";
			buf += "				}\n";
			buf += "				else\n";
			buf += "				{\n";
			buf += "					" + this.nameSingular + " = retData;\n\n";
			buf += "					callback();\n";
			buf += "				}\n";
			buf += "			});\n";
			buf += "		}\n\n";
			buf += "	], function(invalid)\n";
			buf += "	{\n";
			buf += "		if(format == 'json')\n";
			buf += "			res.status(status).send(" + this.nameSingular + ");\n";
			buf += "		else\n";
			buf += "		{\n";
			buf += "			if(invalid)\n";
			buf += "				res.status(status).render('" + this.nameSingular + "/not-found');\n";
			buf += "			else\n";
			buf += "				res.status(status).render('" + this.nameSingular + "/get-single', { " + this.nameSingular + " : " + this.nameSingular + " });\n";
			buf += "		}\n";
			buf += "	});\n";
			buf += "};\n\n";

			return buf;
		},

		createForm : function()
		{
			var buf = "";

			// GET
			buf += "/*\n * [GET] FORM CREATE AN ENTRY FOR " + this.nameSingularCap + "\n *\n";
			buf += " *\n * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

			buf += "exports.getNew" + this.nameSingularCap + "Form = function(req, res)\n";
			buf += "{\n";
			buf += "	res.status(200).render('" + this.nameSingular + "/create');\n";
			buf += "};\n\n";

			return buf;
		},

		createInternForm : function()
		{
			var buf = "";

			for(var i=0; i<this.fields.length; i++)
			{
				if(this.fields[i].type == 'Json')
				{
					// GET
					buf += "/*\n * [GET] FORM CREATE AN ENTRY OF " + this.fields[i].name.toUpperCase() + " FOR " + this.nameSingularCap + "\n *\n";
					buf += " *\n * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

					buf += "exports.getNewIntern" + inflection.camelize(this.fields[i].name) + "Form = function(req, res)\n";
					buf += "{\n";
					buf += "	var id = req.params.id;\n\n";
					buf += "	" + this.nameSingularCap + "\n";
					buf += "	.findOne({ _id : id })\n";
					buf += "	.exec(function(err, retData)\n";
					buf += "	{\n";
					buf += "		if(retData == null)\n";
					buf += "			res.status(404).render('" + this.nameSingular + "/not-found');\n";
					buf += "		else\n";
					buf += "			res.status(200).render('" + this.nameSingular + "/create-" + this.fields[i].name + "', { " + this.nameSingular + " : retData });\n";
					buf += "	});\n";
					buf += "};\n\n";
				}
			}

			return buf;
		},

		create : function()
		{
			var buf = "";

			// POST
			buf += "/*\n * [POST] CREATE AN ENTRY FOR " + this.nameSingularCap + "\n *\n";

			for(var i in this.fields)
			{
				if(this.fields[i].type != "Json")
				{
					buf += " * @param " + this.fields[i].type + " " + this.fields[i].name + "\n";
				}
			}

			buf += " *\n * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

			buf += "exports.post" + this.nameSingularCap + " = function(req, res)\n";
			buf += "{\n";
			buf += "	var data = req.body;\n\n";
			buf += "	var status = 200;\n";
			buf += "	var format = (req.query.format != null) ? req.query.format : 'html';\n\n";
			buf += "	var " + this.nameSingular + " = null;\n\n";

			buf += "	async.series([\n\n";

			// VERIFY GIVEN DATA
			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			if(data == null)\n";
			buf += "			{\n";
			buf += "				status = 400;\n";
			buf += "				callback(true);\n";
			buf += "			}\n";

			for(var i in this.fields)
			{
				if(this.fields[i].type != "Json")
				{
					buf += "			else if(data." + this.fields[i].name + " === undefined)\n";
					buf += "			{\n";
					buf += "				status = 400;\n";
					buf += "				callback(true);\n";
					buf += "			}\n";
				}
			}

			buf += "			else \n";
			buf += "			{\n";
			buf += "				callback();\n";
			buf += "			}\n";
			buf += "		},\n";

			// HAS UNIQUE?
			var hasUnique = 0;

			for(var i in this.fields)
			{
				if(this.fields[i].unique !== undefined)
				{
					hasUnique++;
				}
			}

			if(hasUnique > 0)
			{
				buf += "		function(callback)\n";
				buf += "		{\n";
				buf += "			" + this.nameSingularCap + "\n";
				buf += "			.findOne({\n";
				buf += "				$or : [\n";

				var gone = 0;

				for(var i in this.fields)
				{
					if(this.fields[i].unique !== undefined)
					{
						buf += "					{ " + this.fields[i].name + " : data." + this.fields[i].name + " }";

						gone++;

						if(hasUnique > gone)
						{
							buf += ",\n";
						}
						else
						{
							buf += "\n";
						}
					}
				}

				buf += "				]\n";
				buf += "			})\n";
				buf += "			.exec(function(err, retData)\n";
				buf += "			{\n";
				buf += "				if(retData != null)\n";
				buf += "				{\n";
				buf += "					status = 400;\n";
				buf += "					callback(true);\n";
				buf += "				}\n";
				buf += "				else\n";
				buf += "				{\n";
				buf += "					callback();\n";
				buf += "				}\n";
				buf += "			});\n";
				buf += "		},\n";
			}

			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			" + this.nameSingular + " = new " + this.nameSingularCap + "({\n";

			for(var i=0; i<this.fields.length; i++)
			{
				if(this.fields[i].type != "Json")
				{
					buf += "				" + this.fields[i].name + " : data." + this.fields[i].name + ",\n";
				}
			}

			buf += "			});\n\n";
			buf += "			" + this.nameSingular + ".save(function(err, retData)\n";
			buf += "			{\n";
			buf += "				" + this.nameSingular + " = retData;\n\n";
			buf += "				if(err != null)\n";
			buf += "				{\n";
			buf += "					status = 400;\n";
			buf += "					callback(true);\n";
			buf += "				}\n\n";
			buf += "				callback();\n";
			buf += "			});\n";
			buf += "		}\n";
			buf += "	], function(invalid)\n";
			buf += "	{\n";
			buf += "		if(format == 'json')\n";
			buf += "			res.status(status).send(" + this.nameSingular + ");\n";
			buf += "		else\n";
			buf += "		{\n";
			buf += "			if(status != 200)\n";
			buf += "				res.status(200).render('" + this.nameSingular + "/create', { error : true });\n";
			buf += "			else\n";
			buf += "				res.status(status).render('" + this.nameSingular + "/get-single', { " + this.nameSingular + " : " + this.nameSingular + " });\n";
			buf += "		}\n";
			buf += "	});\n";
			buf += "};\n\n";

			return buf;
		},

		createIntern : function()
		{
			var buf = "";

			for(var i=0; i<this.fields.length; i++)
			{
				var field = this.fields[i];

				if(field.type == 'Json')
				{
					// POST
					buf += "/*\n * [POST] CREATE AN ENTRY OF " + field.name.toUpperCase() + " FOR " + this.nameSingularCap + "\n *\n";

					for(var j in field.content)
					{
						buf += " * @param " + field.content[j].type + " " + field.content[j].name + "\n";
					}

					buf += " *\n * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

					buf += "exports.postNewIntern" + inflection.camelize(field.name) + "Form = function(req, res)\n";
					buf += "{\n";
					buf += "	var id = req.params.id;\n";
					buf += "	var data = req.body;\n\n";
					buf += "	var status = 200;\n";
					buf += "	var format = (req.query.format != null) ? req.query.format : 'html';\n\n";
					buf += "	var " + this.nameSingular + " = null;\n\n";

					buf += "	async.series([\n\n";

					// VERIFY GIVEN DATA
					buf += "		function(callback)\n";
					buf += "		{\n";
					buf += "			if(data == null)\n";
					buf += "			{\n";
					buf += "				status = 400;\n";
					buf += "				callback(true);\n";
					buf += "			}\n";

					for(var j in field.content)
					{
						buf += "			else if(data."+ field.content[j].name +" === undefined)\n";
						buf += "			{\n";
						buf += "				status = 400;\n";
						buf += "				callback(true);\n";
						buf += "			}\n";
					}

					buf += "			else\n";
					buf += "			{\n";
					buf += "				callback();\n";
					buf += "			}\n";
					buf += "		},\n";

					// GET ENTRY
					buf += "		function(callback)\n";
					buf += "		{\n";
					buf += "			" + this.nameSingularCap + "\n";
					buf += "			.findOne({ _id : id })\n";
					buf += "			.exec(function(err, retData)\n";
					buf += "			{\n";
					buf += "				if(retData == null)\n";
					buf += "				{\n";
					buf += "					status = 400;\n";
					buf += "					callback(true);\n";
					buf += "				}\n";
					buf += "				else\n";
					buf += "				{\n";
					buf += "					" + this.nameSingular + " = retData;\n\n";
					buf += "					callback();\n";
					buf += "				}\n";
					buf += "			});\n";
					buf += "		},\n";

					// ADD CHANGES
					buf += "		function(callback)\n";
					buf += "		{\n";
					buf += "			var " + field.name + " = {};\n\n";

					for(var j in field.content)
					{
						buf += "			" + field.name + "."+ field.content[j].name +" = data."+ field.content[j].name +";\n";
					}

					buf += "\n";

					buf += "			if(" + this.nameSingular + "." + inflection.pluralize(field.name) + " === undefined)\n";
					buf += "				" + this.nameSingular + "." + inflection.pluralize(field.name) + " = [];\n\n";

					buf += "			" + this.nameSingular + "." + inflection.pluralize(field.name) + ".push(" + field.name + ");\n";

					buf += "\n";
					buf += "			callback();\n";
					buf += "		},\n";
					
					// SAVE CHANGES
					buf += "		function(callback)\n";
					buf += "		{\n";
					buf += "			" + this.nameSingular + ".save(function(err, retData)\n";
					buf += "			{\n";
					buf += "				" + this.nameSingular + " = retData;\n\n";
					buf += "				callback();\n";
					buf += "			});\n";
					buf += "		}\n";
					buf += "	], function(invalid)\n";
					buf += "	{\n";
					buf += "		if(format == 'json')\n";
					buf += "			res.status(status).send(" + this.nameSingular + ");\n";
					buf += "		else\n";
					buf += "			res.redirect('/" + this.nameSingular + "/'+" + this.nameSingular + "._id);\n";
					buf += "	});\n";
					buf += "};\n\n";
				}
			}

			return buf;
		},

		updateForm : function()
		{
			var buf = "";

			// GET
			buf += "/*\n * [GET] FORM EDIT AN ENTRY FOR " + this.nameSingularCap + "\n *\n";
			buf += " *\n * @return View\n */\n";

			buf += "exports.getEdit" + this.nameSingularCap + "Form = function(req, res)\n";
			buf += "{\n";
			buf += "	var id = req.params.id;\n\n";
			buf += "	" + this.nameSingularCap + "\n";
			buf += "	.findOne({ _id : id })\n";
			buf += "	.exec(function(err, retData)\n";
			buf += "	{\n";
			buf += "		if(retData == null)\n";
			buf += "			res.status(404).render('" + this.nameSingular + "/not-found');\n";
			buf += "		else\n";
			buf += "			res.status(200).render('" + this.nameSingular + "/update', { " + this.nameSingular + " : retData });\n";
			buf += "	});\n";
			buf += "};\n\n";
			
			return buf;
		},

		update : function()
		{
			var buf = "";

			// PUT
			buf += "/*\n * [PUT] EDIT AN ENTRY FOR " + this.nameSingularCap + "\n *\n";

			for(var i in this.fields)
			{
				if(this.fields[i].type != "Json")
				{
					buf += " * @param [opt] " + this.fields[i].type + " " + this.fields[i].name + "\n";
				}
			}

			buf += " *\n * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

			buf += "exports.put" + this.nameSingularCap + " = function(req, res)\n";
			buf += "{\n";
			buf += "	var id = req.params.id;\n";
			buf += "	var data = req.body;\n\n";
			buf += "	var status = 200;\n";
			buf += "	var format = (req.query.format != null) ? req.query.format : 'html';\n\n";
			buf += "	var " + this.nameSingular + " = null;\n\n";

			buf += "	async.series([\n\n";

			// VERIFY GIVEN DATA
			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			if(data == null)\n";
			buf += "			{\n";
			buf += "				status = 400;\n";
			buf += "				callback(true);\n";
			buf += "			}\n";
			buf += "			else\n";
			buf += "			{\n";
			buf += "				callback();\n";
			buf += "			}\n";
			buf += "		},\n";

			// GET ENTRY
			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			" + this.nameSingularCap + "\n";
			buf += "			.findOne({ _id : id })\n";
			buf += "			.exec(function(err, retData)\n";
			buf += "			{\n";
			buf += "				if(retData == null)\n";
			buf += "				{\n";
			buf += "					status = 400;\n";
			buf += "					callback(true);\n";
			buf += "				}\n";
			buf += "				else\n";
			buf += "				{\n";
			buf += "					" + this.nameSingular + " = retData;\n\n";
			buf += "					callback();\n";
			buf += "				}\n";
			buf += "			});\n";
			buf += "		},\n";

			// ADD CHANGES
			buf += "		function(callback)\n";
			buf += "		{\n";

			for(var i in this.fields)
			{
				if(this.fields[i].type != 'Json')
				{
					buf += "			if(data." + this.fields[i].name + " !== undefined)\n";
					buf += "			{\n";
					buf += "				" + this.nameSingular + "." + this.fields[i].name + " = data." + this.fields[i].name + ";\n";
					buf += "			}\n";
				}
			}

			buf += "\n";
			buf += "			callback();\n";
			buf += "		},\n";
			
			// HAS UNIQUE?
			var hasUnique = 0;

			for(var i in this.fields)
			{
				if(this.fields[i].unique !== undefined)
				{
					hasUnique++;
				}
			}

			if(hasUnique > 0)
			{
				buf += "		function(callback)\n";
				buf += "		{\n";
				buf += "			" + this.nameSingularCap + "\n";
				buf += "			.findOne({\n";
				buf += "				$or : [\n";

				var gone = 0;

				for(var i in this.fields)
				{
					if(this.fields[i].unique !== undefined)
					{
						buf += "					{ " + this.fields[i].name + " : data." + this.fields[i].name + " }";

						gone++;

						if(hasUnique > gone)
						{
							buf += ",\n";
						}
						else
						{
							buf += "\n";
						}
					}
				}

				buf += "				]\n";
				buf += "			})\n";
				buf += "			.exec(function(err, retData)\n";
				buf += "			{\n";
				buf += "				if(retData != null)\n";
				buf += "				{\n";
				buf += "					if(!retData._id.equals(" + this.nameSingular + "._id))\n";
				buf += "					{\n";
				buf += "						status = 400;\n";
				buf += "						callback(true);\n";
				buf += "					}\n";
				buf += "					else\n";
				buf += "					{\n";
				buf += "						callback();\n";
				buf += "					}\n";
				buf += "				}\n";
				buf += "				else\n";
				buf += "				{\n";
				buf += "					callback();\n";
				buf += "				}\n";
				buf += "			});\n";
				buf += "		},\n";
			}

			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			" + this.nameSingular + ".save(function(err, retData)\n";
			buf += "			{\n";
			buf += "				" + this.nameSingular + " = retData;\n\n";
			buf += "				callback();\n";
			buf += "			});\n";
			buf += "		}\n";
			buf += "	], function(invalid)\n";
			buf += "	{\n";
			buf += "		if(format == 'json')\n";
			buf += "			res.status(status).send(" + this.nameSingular + ");\n";
			buf += "		else\n";
			buf += "			res.status(status).render('" + this.nameSingular + "/get-single', { " + this.nameSingular + " : " + this.nameSingular + " });\n";
			buf += "	});\n";
			buf += "};\n\n";
			
			return buf;
		},

		delete : function()
		{
			var buf = "";

			// DELETE
			buf += "/*\n * [DELETE] DELETE AN ENTRY FOR " + this.nameSingularCap + "\n *\n";
			buf += " * @return null\n */\n";

			buf += "exports.delete" + this.nameSingularCap + " = function(req, res)\n";
			buf += "{\n";
			buf += "	var id = req.params.id;\n";
			buf += "	var status = 200;\n";
			buf += "	var format = (req.query.format != null) ? req.query.format : 'html';\n\n";
			buf += "	var " + this.nameSingular + " = null;\n\n";

			buf += "	async.series([\n\n";

			// GET ENTRY
			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			" + this.nameSingularCap + "\n";
			buf += "			.findOne({ _id : id })\n";
			buf += "			.exec(function(err, retData)\n";
			buf += "			{\n";
			buf += "				if(retData == null)\n";
			buf += "				{\n";
			buf += "					status = 400;\n";
			buf += "					callback(true);\n";
			buf += "				}\n";
			buf += "				else\n";
			buf += "				{\n";
			buf += "					" + this.nameSingular + " = retData;\n\n";
			buf += "					callback();\n";
			buf += "				}\n";
			buf += "			});\n";
			buf += "		},\n";

			// DELETE ENTRY
			buf += "		function(callback)\n";
			buf += "		{\n";
			buf += "			" + this.nameSingular + ".remove(function(err, retData)\n";
			buf += "			{\n";
			buf += "				callback();\n";
			buf += "			});\n";
			buf += "		}\n";
			buf += "	], function(invalid)\n";
			buf += "	{\n";
			buf += "		if(format == 'json')\n";
			buf += "			res.status(status).send('');\n";
			buf += "		else\n";
			buf += "			res.status(status).render('" + this.nameSingular + "/delete');\n";
			buf += "	});\n";
			buf += "};\n\n";
			
			return buf;
		},

		deleteIntern : function()
		{
			var buf = "";

			for(var i=0; i<this.fields.length; i++)
			{
				var field = this.fields[i];

				if(field.type == 'Json')
				{
					// POST
					buf += "/*\n * [DELETE] DELETE AN ENTRY OF " + field.name.toUpperCase() + " FOR " + this.nameSingularCap + "\n *\n";

					buf += " *\n * @return " + this.nameSingularCap + " " + this.nameSingular + "\n */\n";

					buf += "exports.deleteIntern" + inflection.camelize(field.name) + " = function(req, res)\n";
					buf += "{\n";
					buf += "	var id = req.params.id;\n";
					buf += "	var index = req.params.index;\n";
					buf += "	var status = 200;\n";
					buf += "	var format = (req.query.format != null) ? req.query.format : 'html';\n\n";
					buf += "	var " + this.nameSingular + " = null;\n\n";

					buf += "	async.series([\n\n";

					// GET ENTRY
					buf += "		function(callback)\n";
					buf += "		{\n";
					buf += "			" + this.nameSingularCap + "\n";
					buf += "			.findOne({ _id : id })\n";
					buf += "			.exec(function(err, retData)\n";
					buf += "			{\n";
					buf += "				if(retData == null)\n";
					buf += "				{\n";
					buf += "					status = 400;\n";
					buf += "					callback(true);\n";
					buf += "				}\n";
					buf += "				else\n";
					buf += "				{\n";
					buf += "					" + this.nameSingular + " = retData;\n\n";
					buf += "					callback();\n";
					buf += "				}\n";
					buf += "			});\n";
					buf += "		},\n";

					// ADD CHANGES
					buf += "		function(callback)\n";
					buf += "		{\n";
					buf += "			" + this.nameSingular + "." + field.name + ".splice(index, 1);\n\n";
					buf += "			" + this.nameSingular + ".save(function(err, retData)\n";
					buf += "			{\n";
					buf += "				" + this.nameSingular + " = retData;\n\n";
					buf += "				callback();\n";
					buf += "			});\n";
					buf += "		}\n";
					buf += "	], function(invalid)\n";
					buf += "	{\n";
					buf += "		if(format == 'json')\n";
					buf += "			res.status(status).send(" + this.nameSingular + ");\n";
					buf += "		else\n";
					buf += "			res.redirect('/" + this.nameSingular + "/'+" + this.nameSingular + "._id);\n";
					buf += "	});\n";
					buf += "};\n\n";
				}
			}

			return buf;
		}
	}

	exports.dissect = function(scaffold, model)
	{
		new DissectController(scaffold).dissect(model);
	}
})();

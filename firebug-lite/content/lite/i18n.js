/* See license.txt for terms of usage */

FBL.ns( /** @scope s_i18n */ function() { with (FBL) {
// ************************************************************************************************

// TODO: xxxpedro localization
var oSTR =
{
    "NoMembersWarning": "There are no properties to show for this object.",
    
    "EmptyStyleSheet": "There are no rules in this stylesheet.",
    "EmptyElementCSS": "This element has no style rules.",
    "AccessRestricted": "Access to restricted URI denied.",
    
    "net.label.Parameters": "Parameters",
    "net.label.Source": "Source",
    "URLParameters": "Params",
    
    "EditStyle": "Edit Element Style...",
    "NewRule": "New Rule...",
    
    "NewProp": "New Property...",
    "EditProp": 'Edit "%s"',
    "DeleteProp": 'Delete "%s"',
    "DisableProp": 'Disable "%s"'
};

// ************************************************************************************************

FBL.$STR = function(name)
{
    return oSTR.hasOwnProperty(name) ? oSTR[name] : name;
};

FBL.$STRF = function(name, args)
{
    if (!oSTR.hasOwnProperty(name)) return name;
    
    var format = oSTR[name];
    var objIndex = 0;
    
    var parts = parseFormat(format);
    var trialIndex = objIndex;
    var objects = args;
    
    for (var i= 0; i < parts.length; i++)
    {
        var part = parts[i];
        if (part && typeof(part) == "object")
        {
            if (++trialIndex > objects.length)  // then too few parameters for format, assume unformatted.
            {
                format = "";
                objIndex = -1;
                parts.length = 0;
                break;
            }
        }

    }
    
    var result = [];
    for (var i = 0; i < parts.length; ++i)
    {
        var part = parts[i];
        if (part && typeof(part) == "object")
        {
            result.push(""+args.shift());
        }
        else
            result.push(part);
    }
    
    return result.join("");
};

// ************************************************************************************************

var parseFormat = function parseFormat(format)
{
    var parts = [];
    if (format.length <= 0)
        return parts;

    var reg = /((^%|.%)(\d+)?(\.)([a-zA-Z]))|((^%|.%)([a-zA-Z]))/;
    for (var m = reg.exec(format); m; m = reg.exec(format))
    {
        if (m[0].substr(0, 2) == "%%")
        {
            parts.push(format.substr(0, m.index));
            parts.push(m[0].substr(1));
        }
        else
        {
            var type = m[8] ? m[8] : m[5];
            var precision = m[3] ? parseInt(m[3]) : (m[4] == "." ? -1 : 0);

            var rep = null;
            switch (type)
            {
                case "s":
                    rep = FirebugReps.Text;
                    break;
                case "f":
                case "i":
                case "d":
                    rep = FirebugReps.Number;
                    break;
                case "o":
                    rep = null;
                    break;
            }

            parts.push(format.substr(0, m[0][0] == "%" ? m.index : m.index+1));
            parts.push({rep: rep, precision: precision, type: ("%" + type)});
        }

        format = format.substr(m.index+m[0].length);
    }

    parts.push(format);
    return parts;
};

// ************************************************************************************************
}});
// Unused code from app.js:

/**
 * Return prefered browser language
 */
GmailToTrello.App.prototype.browserLanguage = function() {
    let lang = window.navigator.languages ? window.navigator.languages[0] : null;
    
    lang = lang || window.navigator.language || window.navigator.browserLanguage || window.navigator.userLanguage;

    if (lang.indexOf('-') !== -1)
        lang = lang.split('-')[0];

    if (lang.indexOf('_') !== -1)
        lang = lang.split('_')[0];

    return lang;
};

/*
    ISO: yyyy-MM-ddTHH:mm:ssZ
    "29. Mai 2017 um 15:18"
    "Wed, Mar 15, 2017 9:18 PM"
 ? timeAttr_k.replace(/(\d) (\D\D) (\d)/, '$1 $3') : ''); // BUG (Ace, 29-Jan-2017): Replacing 'at' without spaces will mess up "Sat" which will then cause Date.parse to fail.
*/
/**
 * Parse international time format and return a valid date object or an empty string
 */
GmailToTrello.App.prototype.parseInternationalDateTime = function(dateTime_in) {
    if (!dateTime_in) {
        return '';
    }

    let dateTime = dateTime_in.trim().toLowerCase();

    // ISO 639-2: https://www.loc.gov/standards/iso639-2/php/code_list.php
    // Months: http://web.library.yale.edu/cataloging/months.htm
    const geo_datetime_k = {
        '_default': {
            'hour': ' (\\d{1,2}):\\d{1,2} ?(am|pm)?$',
            'minutes': ' \\d{1,2}:(\\d{2})',
            'year': ' (\\d{2,4}) ',
            'day': ' (\\d{1,2}), ',
            'month': ' ([a-z]{3,}) ',
            'month_names': {
                'jan': 1,
                'feb': 2,
                'mar': 3,
                'apr': 4,
                'may': 5,
                'jun': 6,
                'jul': 7,
                'aug': 8,
                'sep': 9,
                'oct': 10,
                'nov': 11,
                'dec': 12
            }
        },
        'en': {
            /* everything will default to _default */
        },
        'de': {
            /* everything will default to _default except: */
            'day': '^(\\d{1,2})\\. ',
            'month_names': {
                'jan': 1,
                'jän': 1,
                'feb': 2,
                'mär': 3,
                'apr': 4,
                'mai': 5,
                'jun': 6,
                'jul': 7,
                'aug': 8,
                'sep': 9,
                'okt': 10,
                'nov': 11,
                'dez': 12
            }
        },
        'es': {
            /* everything will default to _default except: */
            'day': 'de',
            'month_names': {
                'ene': 1,
                'feb': 2,
                'mar': 3,
                'abr': 4,
                'may': 5,
                'jun': 6,
                'jul': 7,
                'ago': 8,
                'sep': 9,
                'set': 9,
                'oct': 10,
                'nov': 11,
                'dic': 12
            }
        }
    };

    let found_datetime = {
        'hour': 0,
        'minutes': 0,
        'year': 0,
        'month': 0,
        'day': 0,
        'geo': ''
    };

    let geo_ref_resolve = function(geo, ref) {
        if (!geo_datetime_k[geo].hasOwnProperty(ref)) {
            if (geo_datetime_k._default.hasOwnProperty(ref)) {
                return geo_datetime_k._default[ref];
            } else {
                return '';
            }
        } else if (geo_datetime_k.hasOwnProperty(geo_datetime_k[geo][ref])) {
            return geo_datetime_k[geo_datetime_k[geo][ref]][ref];
        } else {
            return geo_datetime_k[geo][ref];
        }
    };

    const lang_k = this.browserLanguage();

    let geo_search = [lang_k, 'en']; // Step back if desired
    let geo_key = '';
    let geo_ref = '';
    while (found_datetime.geo === ''
           && (geo_key = geo_search.shift())
           && (geo_ref = geo_ref_resolve(geo_key, 'month'))) {
        const rx_k = new RegExp (geo_ref);
        const match_k = dateTime.match(rx_k);
        const value_k = (match_k && match_k[1] ? ('   ' + match_k[1]).substr(-3) : '');
        if (value_k
            && (geo_ref = geo_ref_resolve(geo_key, 'month_names'))
            && geo_ref.hasOwnProperty(value_k)) {
            found_datetime.geo = geo_key;
            found_datetime.month = geo_ref[value_k];
        }
    }

    if (!found_datetime.geo) {
        gtt_log('GtT::parseInternationalDatetime: Error! No Geo for lang_k:' + lang_k);
        return '';
    }

    $.each(['hour', 'minutes', 'year', 'day'], function(iter, item) {
        geo_ref = geo_ref_resolve(found_datetime.geo, item);
        const rx_k = new RegExp (geo_ref);
        const match_k = dateTime.match(rx_k);
        const value_k = (match_k && match_k.length > 0 && match_k[1] ? match_k[1] : '');
        const value2_k = (match_k && match_k.length > 1 && match_k[2] ? match_k[2] : '');
        if (value_k) {
            if (value2_k) {
                let hr = parseInt(value_k, 10);
                if (value_k == 12) {
                    hr = 0;
                }
                if (value2_k === 'pm') {
                    hr += 12;
                }
                found_datetime[item] = hr;
            } else {
                found_datetime[item] = value_k;
            }
        }
    });

    let forceTwoDigits = function(num) {
        return ('00' + ((num || '').toString())).substr(-2);
    };

    const dict_k = {
        'year': found_datetime.year.toString().length === 4 ? found_datetime.year : 2000 + parseInt(found_dattime.year, 10),
        'month': forceTwoDigits(found_datetime.month),
        'day': forceTwoDigits(found_datetime.day),
        'hour': forceTwoDigits(found_datetime.hour),
        'minutes': forceTwoDigits(found_datetime.minutes)
    };

    const iso_k = this.replacer('%year%-%month%-%day%T%hour%:%minutes%:00Z', dict_k);
    return iso_k;
}

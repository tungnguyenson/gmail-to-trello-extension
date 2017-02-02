var WaitCounter = {
	items : {}
};

WaitCounter.stop = function(name) {
	if (WaitCounter.items[name]) {
		var item = WaitCounter.items[name];

		if (item.handler !== null) {
			clearInterval(item.handler);
			item.busy = false;
		}
	}

};

WaitCounter.start = function(name, interval, maxSteps, callBack) {
	// TODO: replace current event to a new one
	if (!WaitCounter.items[name]) {
		WaitCounter.items[name] = {
			name:name,
			interval:interval,
			maxSteps:maxSteps,
			callBack:callBack,
			handler:null,
			busy:false,
			count:0
		};

	} 

	var current = WaitCounter.items[name];

	if (!current.busy) {
		current.counter = 0;
		current.busy = true;

		current.handler = setInterval(function() {
			current.counter++;
			log('WaitCounter['+current.name+']. Round #'+current.counter);

			if (current.counter>=current.maxSteps) {
				clearInterval(current.handler);
				current.busy = false;
			}
			
			callBack();



		}, current.interval);	
	}


	
};
function monthly(customOptions) {

	var self = this;

	// These are overridden by options declared in footer
	this.defaults = {
		dataType: "xml",
		disablePast: false,
		eventList: true,
		events: "",
		jsonUrl: "",
		linkCalendarToEventUrl: false,
		maxWidth: false,
		mode: "event",
		setWidth: false,
		showTrigger: "",
		startHidden: false,
		stylePast: false,
		target: "",
		useIsoDateFormat: false,
		weekStart: 0,	// Sunday
		xmlUrl: "",
		triggerPanel: true
	};

	this.parent = "";
	this.options = {};
	this.params = {};

	// How many days are in this month?
	this.daysInMonth = function(month, year) {
		return month === 2 ? (year & 3) || (!(year % 25) && year & 15) ? 28 : 29 : 30 + (month + (month >> 3) & 1);
	}

	// Build the month
	this.setMonthly = function(month, year) {
		$(self.parent).data("setMonth", month).data("setYear", year);
		$(self.parent).attr("setMonth", month).attr("setYear", year);

		// Get number of days
		var index = 0,
			dayQty = self.daysInMonth(month, year),
			// Get day of the week the first day is
			mZeroed = month - 1,
			firstDay = new Date(year, mZeroed, 1, 0, 0, 0, 0).getDay(),
			settingCurrentMonth = month === self.params.currentMonth && year === self.params.currentYear;

		// Remove old days
		$(self.parent + " .monthly-day, " + self.parent + " .monthly-day-blank").remove();
		$(self.parent + " .monthly-event-list, " + self.parent + " .monthly-day-wrap").empty();
		// Print out the days
		for(var dayNumber = 1; dayNumber <= dayQty; dayNumber++) {
			// Check if it's a day in the past
			var isInPast = self.options.stylePast && (
				year < currentYear
				|| (year === currentYear && (
					month < currentMonth
					|| (month === currentMonth && dayNumber < currentDay)
				))),
				innerMarkup = '<div class="monthly-day-number">' + dayNumber + '</div><div class="monthly-indicator-wrap"></div>';
			if(self.options.mode === "event") {
				var thisDate = new Date(year, mZeroed, dayNumber, 0, 0, 0, 0);
				$(self.parent + " .monthly-day-wrap").append('<div class="m-d monthly-day monthly-day-event' + (isInPast ? ' monthly-past-day' : '') + ' dt' + thisDate.toISOString().slice(0, 10) + '" data-number="' + dayNumber + '">' + innerMarkup + '</div>');
				$(self.parent + " .monthly-event-list").append('<div class="monthly-list-item" id="' + self.options.uniqueId + "day" + dayNumber + '" data-number="' + dayNumber + '"><div class="monthly-event-list-date">' + self.params.dayNames[thisDate.getDay()] + '<br>' + dayNumber + '</div></div>');
			} else {
				$(self.parent + " .monthly-day-wrap").append('<a href="#" class="m-d monthly-day monthly-day-pick' + (isInPast ? " monthly-past-day" : "") + '" data-number="' +dayNumber+'">' + innerMarkup + '</span>');
			}
		}

		if (settingCurrentMonth) {
			$(self.parent + ' *[data-number="' + self.params.currentDay + '"]').addClass("monthly-today");
		}

		// Reset button
		$(self.parent + " .monthly-header-title .monthly-header-title-date").html(self.params.monthNames[month - 1] + " " + year );

		// Account for empty days at start
		if(self.params.weekStartsOnMonday) {
			if (firstDay === 0) {
				self._prependBlankDays(6);
			} else if (firstDay !== 1) {
				self._prependBlankDays(firstDay - 1);
			}
		} else if(firstDay !== 7) {
			self._prependBlankDays(firstDay);
		}

		// Account for empty days at end
		var numdays = $(self.parent + " .monthly-day").length,
			numempty = $(self.parent + " .monthly-day-blank").length,
			totaldays = numdays + numempty,
			roundup = Math.ceil(totaldays / 7) * 7,
			daysdiff = roundup - totaldays;
		if(totaldays % 7 !== 0) {
			for(index = 0; index < daysdiff; index++) {
				$(self.parent + " .monthly-day-wrap").append(self.params.markupBlankDay);
			}
		}

		// Events
		if (self.options.mode === "event") {
			self.addEvents(month, year);
		}
		var divs = $(self.parent + " .m-d");
		for(index = 0; index < divs.length; index += 7) {
			divs.slice(index, index + 7).wrapAll('<div class="monthly-week"></div>');
		}
	}

	this.addNewEvent = function(event) {
		var tempMonth = $(self.parent).data("setMonth");
		var tempYear  = $(self.parent).data("setYear");
		self.addEvent(event,tempMonth,tempYear);
		setTimeout(function() {
			self.setMonthly(tempMonth,tempYear);
		},200)
		
	}

	this.addEvent = function(event, setMonth, setYear) {
		// Year [0]   Month [1]   Day [2]
		var fullStartDate = self._getEventDetail(event, "startdate"),
			fullEndDate = self._getEventDetail(event, "enddate"),
			startArr = fullStartDate.split("-"),
			startYear = parseInt(startArr[0], 10),
			startMonth = parseInt(startArr[1], 10),
			startDay = parseInt(startArr[2], 10),
			startDayNumber = startDay,
			endDayNumber = startDay,
			showEventTitleOnDay = startDay,
			startsThisMonth = startMonth === setMonth && startYear === setYear,
			happensThisMonth = startsThisMonth;

		if(fullEndDate) {
			// If event has an end date, determine if the range overlaps this month
			var	endArr = fullEndDate.split("-"),
				endYear = parseInt(endArr[0], 10),
				endMonth = parseInt(endArr[1], 10),
				endDay = parseInt(endArr[2], 10),
				startsInPastMonth = startYear < setYear || (startMonth < setMonth && startYear === setYear),
				endsThisMonth = endMonth === setMonth && endYear === setYear,
				endsInFutureMonth = endYear > setYear || (endMonth > setMonth && endYear === setYear);
			if(startsThisMonth || endsThisMonth || (startsInPastMonth && endsInFutureMonth)) {
				happensThisMonth = true;
				startDayNumber = startsThisMonth ? startDay : 1;
				endDayNumber = endsThisMonth ? endDay : self.daysInMonth(setMonth, setYear);
				showEventTitleOnDay = startsThisMonth ? startDayNumber : 1;
			}
		}
		if(!happensThisMonth) {
			return;
		}

		var startTime = self._getEventDetail(event, "starttime"),
			timeHtml = "",
			eventURL = self._getEventDetail(event, "url"),
			eventTitle = self._getEventDetail(event, "name"),
			eventClass = self._getEventDetail(event, "class"),
			eventColor = self._getEventDetail(event, "color"),
			eventId = self._getEventDetail(event, "id"),
			customClass = eventClass ? " " + eventClass : "",
			dayStartTag = "<div",
			dayEndTags = "</span></div>";

		if(startTime) {
			var endTime = self._getEventDetail(event, "endtime");
			timeHtml = '<div><div class="monthly-list-time-start">' + formatTime(startTime) + "</div>"
				+ (endTime ? '<div class="monthly-list-time-end">' + formatTime(endTime) + "</div>" : "")
				+ "</div>";
		}

		/*
		if(options.linkCalendarToEventUrl && eventURL) {
			dayStartTag = "<a" + attr("href", eventURL);
			dayEndTags = "</span></span>";
		}
		*/
		var	markupDayStart = dayStartTag
				+ ' data-eventid="'+eventId+'"'
				+ ' title="'+eventTitle+'"'
				// BG and FG colors must match for left box shadow to create seamless link between dates
				+ (eventColor ? ' style="background:' + eventColor + '"' : "");
		var markupListEvent = "<a"
				//+ attr("href", eventURL)
				+ ' class="listed-event' + customClass + '"'
				+ ' data-eventid="'+eventId+'"'
				+ (eventColor ? ' style="background:' + eventColor + '"' : "")
				+ ' title="'+eventTitle+'"'
				+ ">" + eventTitle + " " + timeHtml + "</span>";
		for(var index = startDayNumber; index <= endDayNumber; index++) {
			var doShowTitle = index === showEventTitleOnDay;
			// Add to calendar view
			$(markupDayStart
				+ ' class="monthly-event-indicator' + customClass
					// Include a class marking if this event continues from the previous day
					+ (doShowTitle ? '"' : ' monthly-event-continued"')
				+ '><span>' + (doShowTitle ? eventTitle : "") + dayEndTags).appendTo($(self.parent + ' [data-number="' + index + '"] .monthly-indicator-wrap')).click(function(event) {
					event.preventDefault();
					event.stopImmediatePropagation();
					$(self.parent).trigger('event-clicked', {id: eventId, target: $(this)})
			});
			// Add to event list
			$(self.parent + ' .monthly-list-item[data-number="' + index + '"]')
				.addClass("item-has-event")
				.append(markupListEvent);
		}


	}

	this.addEvents = function(month, year) {
		if(self.options.events) {
			// Prefer local events if provided
			self.addEventsFromString(self.options.events, month, year);
		} else {
			var remoteUrl = self.options.dataType === "xml" ? self.options.xmlUrl : self.options.jsonUrl;
			if(remoteUrl) {
				// Replace variables for month and year to load from dynamic sources
				var url = String(remoteUrl).replace("{month}", month).replace("{year}", year);
				$.get(url, {now: $.now()}, function(data) {
					self.addEventsFromString(data, month, year);
				}, self.options.dataType).fail(function() {
					console.error("Monthly.js failed to import " + remoteUrl + ". Please check for the correct path and " + self.options.dataType + " syntax.");
				});
			}
		}
	}

	this.addEventsFromString = function(events, setMonth, setYear) {
		if (self.options.dataType === "xml") {
			$(events).find("event").each(function(index, event) {
				addEvent(event, setMonth, setYear);
			});
		} else if (self.options.dataType === "json") {
			$.each(events.monthly, function(index, event) {
				self.addEvent(event, setMonth, setYear);
			});
		}
	}

	this.attr = function(name, value) {
		var parseValue = String(value);
		var newValue = "";
		for(var index = 0; index < parseValue.length; index++) {
			switch(parseValue[index]) {
				case "'": newValue += "&#39;"; break;
				case "\"": newValue += "&quot;"; break;
				case "<": newValue += "&lt;"; break;
				case ">": newValue += "&gt;"; break;
				default: newValue += parseValue[index];
			}
		}
		return " " + name + "=\"" + newValue + "\"";
	}

	this._appendDayNames = function(startOnMonday) {
		var offset = startOnMonday ? 1 : 0,
			dayName = "",
			dayIndex = 0;
		for(dayIndex = 0; dayIndex < 6; dayIndex++) {
			dayName += "<div>" + self.params.dayNames[dayIndex + offset] + "</div>";
		}
		dayName += "<div>" + self.params.dayNames[startOnMonday ? 0 : 6] + "</div>";
		$(self.parent).append('<div class="monthly-day-title-wrap">' + dayName + '</div><div class="monthly-day-wrap"></div>');
	}

	// Detect the user's preferred language
	this.defaultLocale = function() {
		if(navigator.languages && navigator.languages.length) {
			return navigator.languages[0];
		}
		return navigator.language || navigator.browserLanguage;
	}

	// Use the user's locale if possible to obtain a list of short month names, falling back on English
	this.defaultMonthNames = function() {
		if(typeof Intl === "undefined") {
			return ["Jan", "Feb", "Mar", "Apr", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		}
		var formatter = new Intl.DateTimeFormat(self.params.locale, {month: self.params.monthNameFormat});
		var names = [];
		for(var monthIndex = 0; monthIndex < 12; monthIndex++) {
			var sampleDate = new Date(2017, monthIndex, 1, 0, 0, 0);
			names[monthIndex] = formatter.format(sampleDate);
		}
		return names;
	}

	this.formatDate = function(year, month, day) {
		if(options.useIsoDateFormat) {
			return new Date(year, month - 1, day, 0, 0, 0).toISOString().substring(0, 10);
		}
		if(typeof Intl === "undefined") {
			return month + "/" + day + "/" + year;
		}
		return new Intl.DateTimeFormat(self.params.locale).format(new Date(year, month - 1, day, 0, 0, 0));
	}

	// Use the user's locale if possible to obtain a list of short weekday names, falling back on English
	this.defaultDayNames = function() {
		if(typeof Intl === "undefined") {
			return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		}
		var formatter = new Intl.DateTimeFormat(self.params.locale, {weekday: self.params.weekdayNameFormat}),
			names = [],
			dayIndex = 0,
			sampleDate = null;
		for(dayIndex = 0; dayIndex < 7; dayIndex++) {
			// 2017 starts on a Sunday, so use it to capture the locale's weekday names
			sampleDate = new Date(2017, 0, dayIndex + 1, 0, 0, 0);
			names[dayIndex] = formatter.format(sampleDate);
		}
		return names;
	}

	this._prependBlankDays = function(count) {
		var wrapperEl = $(self.parent + " .monthly-day-wrap"),
			index = 0;
		for(index = 0; index < count; index++) {
			wrapperEl.prepend(self.params.markupBlankDay);
		}
	}

	this._getEventDetail = function(event, nodeName) {
		return self.options.dataType === "xml" ? $(event).find(nodeName).text() : event[nodeName];
	}

	// Returns a 12-hour format hour/minute with period. Opportunity for future localization.
	this.formatTime = function(value) {
		var timeSplit = value.split(":");
		var hour = parseInt(timeSplit[0], 10);
		var period = "AM";
		if(hour > 12) {
			hour -= 12;
			period = "PM";
		} else if (hour == 12) {
			period = "PM";
		} else if(hour === 0) {
			hour = 12;
		}
		return hour + ":" + String(timeSplit[1]) + " " + period;
	}

	this.setNextMonth = function() {
		var	setMonth = $(self.parent).data("setMonth"),
			setYear = $(self.parent).data("setYear"),
			newMonth = setMonth === 12 ? 1 : setMonth + 1,
			newYear = setMonth === 12 ? setYear + 1 : setYear;
		$(self.parent + " .monthly-reset").show();
		self.setMonthly(newMonth, newYear);
		self.viewToggleButton();
	}

	this.setPreviousMonth = function() {
		var setMonth = $(self.parent).data("setMonth"),
			setYear = $(self.parent).data("setYear"),
			newMonth = setMonth === 1 ? 12 : setMonth - 1,
			newYear = setMonth === 1 ? setYear - 1 : setYear;
		$(self.parent + " .monthly-reset").show();
		self.setMonthly(newMonth, newYear);
		self.viewToggleButton();
	}

	// this.to go back to the month view
	this.viewToggleButton = function() {
		/*
		if($(self.parent + " .monthly-event-list").is(":visible")) {
			$(self.parent + " .monthly-cal").remove();
			$(self.parent + " .monthly-header-title").prepend('<span class="monthly-cal"></span>');
		}
		*/
	}

	this.listeners = function() {
		// Advance months
		$(self.parent + " .monthly-next").click(function (event) {
			event.preventDefault();
			event.stopImmediatePropagation();
			self.setNextMonth();
		});

		// Go back in months
		$(self.parent + " .monthly-prev").click(function (event) {
			event.preventDefault();
			event.stopImmediatePropagation();
			self.setPreviousMonth();
		});

		// Reset Month
		$(self.parent + " .monthly-reset").click(function (event) {
			event.preventDefault();
			event.stopImmediatePropagation();
			$(this).hide();
			self.setMonthly(self.params.currentMonth, self.params.currentYear);
			self.viewToggleButton();
		});

		// Back to month view
		$(self.parent + " .monthly-cal").click(function (event) {
			event.preventDefault();
			event.stopImmediatePropagation();
			$(this).hide();
			$(self.parent + " .monthly-event-list").css("transform", "scale(0)");
			setTimeout(function() {
				$(self.parent + " .monthly-event-list").hide();
			}, 250);
		});

		// Click A Day
		$(self.parent).on('event-clicked', function (event, data) {
			// If events, show events list
			if(!self.options.triggerPanel) {
				return;
			}
			var target   = data.target;
			console.log(target);
			var dayBlock = target.closest('.monthly-day');
			var whichDay = dayBlock.data("number");
			if(self.options.mode === "event" && self.options.eventList) {
				var	theList = $(self.parent + " .monthly-event-list"),
					myElement = document.getElementById(self.options.uniqueId + "day" + whichDay),
					topPos = myElement.offsetTop;
				theList.show();
				theList.css("transform");
				theList.css("transform", "scale(1)");
				$(self.parent + ' .monthly-list-item').hide();
				$(self.parent + ' .monthly-cal').show();
				$(self.parent + ' .monthly-list-item[data-number="' + whichDay + '"]').show();
				theList.scrollTop(topPos);
				self.viewToggleButton();
				if(!self.options.linkCalendarToEventUrl) {
					event.preventDefault();
				}
			// If picker, pick date
			} else if (self.options.mode === "picker") {
				var	setMonth = $(self.parent).data("setMonth"),
					setYear = $(self.parent).data("setYear");
				// Should days in the past be disabled?
				if(dayBlock.hasClass("monthly-past-day") && options.disablePast) {
					// If so, don't do anything.
					event.preventDefault();
				} else {
					// Otherwise, select the date ...
					$(String(self.options.target)).val(formatDate(setYear, setMonth, whichDay));
					// ... and then hide the calendar if it started that way
					if(self.options.startHidden) {
						$(self.parent).hide();
					}
				}
				event.preventDefault();
			}
		});

		// Clicking an event within the list
		$(self.parent + " .listed-event").click(function (event) {
			event.preventDefault();
			var href = $(this).attr("href");
			// If there isn't a link, don't go anywhere
			if(!href) {
				event.preventDefault();
			}
		});
	}

	this.init = function(customOptions) {

		var options = $.extend(self.defaults, customOptions);
		self.options = options;
		self.parent = "#" + customOptions.uniqueId;
		self.params.currentDate = new Date(),
		self.params.currentMonth = self.params.currentDate.getMonth() + 1,
		self.params.currentYear = self.params.currentDate.getFullYear(),
		self.params.currentDay = self.params.currentDate.getDate(),
		self.params.locale = (options.locale || self.defaultLocale()).toLowerCase(),
		self.params.monthNameFormat = options.monthNameFormat || "short",
		self.params.weekdayNameFormat = options.weekdayNameFormat || "short",
		self.params.monthNames = options.monthNames || self.defaultMonthNames(),
		self.params.dayNames = options.dayNames || self.defaultDayNames(),
		self.params.markupBlankDay = '<div class="m-d monthly-day-blank"><div class="monthly-day-number"></div></div>',
		self.params.weekStartsOnMonday = options.weekStart === "Mon" || options.weekStart === 1 || options.weekStart === "1",
		self.params.primaryLanguageCode = self.params.locale.substring(0, 2).toLowerCase();

		$(self.parent).addClass('monthly-init')

		if (self.options.maxWidth !== false) {
			$(self.parent).css("maxWidth", self.options.maxWidth);
		}
		if (options.setWidth !== false) {
			$(self.parent).css("width", self.options.setWidth);
		}

		if (self.options.startHidden) {
			$(self.parent).addClass("monthly-pop").css({
				display: "none",
				position: "absolute"
			});
			$(document).on("focus", String(self.options.showTrigger), function (event) {
				$(self.parent).show();
				event.preventDefault();
			});
			$(String(self.options.showTrigger) + ", .monthly-pop").click(function (event) {
				event.stopPropagation();
				event.preventDefault();
			});
			$(document).on("click", function () {
				$(self.parent).hide();
			});
		}

		// Add Day Of Week Titles
		this._appendDayNames(self.params.weekStartsOnMonday);

		// Add CSS classes for the primary language and the locale. This allows for CSS-driven
		// overrides of the language-specific header buttons. Lowercased because locale codes
		// are case-insensitive but CSS is not.
		$(self.parent).addClass("monthly-locale-" + self.params.primaryLanguageCode + " monthly-locale-" + self.params.locale);

		// Add Header & event list markup
		$(self.parent).prepend('<div class="monthly-header"><div class="monthly-header-title"><span class="monthly-cal" style="display: none;"></span><span class="monthly-header-title-date" onclick="return false"></span><span class="monthly-reset" style="display:none;"></span></div><span class="monthly-prev"></span><span class="monthly-next"></span></div>').append('<div class="monthly-event-list"></div>');
		// Set the calendar the first time
		this.setMonthly(self.params.currentMonth, self.params.currentYear);
		this.listeners();
	}

	this.init(customOptions);

}

export default monthly;


const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Lang = imports.lang;
const MessagesIndicator = imports.ui.dateMenu.MessagesIndicator;
const Urgency = imports.ui.messageTray.Urgency;

var MessageCounterIndicator = GObject.registerClass(
class MessageCounterIndicator extends St.Label {
    /*
     * See also ui.dateMenu.MessagesIndicator
     */

    _init() {
        super._init({
            visible: false,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'count-label'
        });

        this._sources = [];
        this._signals = [];

        this._connectSignal(Main.messageTray, 'source-added', this._onSourceAdded.bind(this));
        this._connectSignal(Main.messageTray, 'source-removed', this._onSourceRemoved.bind(this));
        this._connectSignal(Main.messageTray, 'queue-changed', this._updateCount.bind(this));

        let sources = Main.messageTray.getSources();
        sources.forEach(Lang.bind(this, function(source) { this._onSourceAdded(null, source); }));
    }

    _onSourceAdded(tray, source) {
        this._connectSignal(source, 'notify::count', this._updateCount.bind(this));
        this._sources.push(source);
        this._updateCount();
    }

    _onSourceRemoved(tray, source) {
        this._sources.splice(this._sources.indexOf(source), 1);
        this._updateCount();
    }

    _updateCount() {
        let count = 0;
        let label;
        this._sources.forEach(Lang.bind(this,
            function(source) {
                for (let i=0; i < source.notifications.length; i++) {
                    let notification = source.notifications[i];
                    if (notification.urgency >= Urgency.NORMAL) {
                        // increment counter
                        count++;
                    }
                }
            }));

        if (count > 10) {
            // Limit count
            count = 10;
        }

        // Create unicode character based on count (➊ .. ➓)
        label = String.fromCharCode(0x2789 + count)
        this.text = label;
        this.visible = (count > 0);
    }

    _connectSignal(target, signal, callback) {
        let s = target.connect(signal, callback);
        this._signals.push([target, s])
    }

    destroy() {
        this._signals.forEach( (sig) => sig[0].disconnect(sig[1]) );
        super.destroy();
    }
});


let count_indicator, orig_indicator, orig_pad, dateMenu;

function init() {
}

function enable() {
    dateMenu = Main.panel.statusArea.dateMenu;
    let dateMenuLayout = dateMenu.get_children()[0];
    let actors = dateMenuLayout.get_children();
    orig_pad = actors[0];
    orig_indicator = dateMenu._indicator;

    // remove sizing constraint for original indicator
    orig_pad.remove_constraint(orig_pad.get_constraints()[0])

    // Remove original indicator
    dateMenuLayout.remove_child(orig_indicator)

    // Create new indicator
    count_indicator = new MessageCounterIndicator();
    dateMenu._indicator = count_indicator;

    // Add it with constraint
    count_indicator.bind_property('visible', orig_pad, 'visible', GObject.BindingFlags.SYNC_CREATE);
    orig_pad.add_constraint(new Clutter.BindConstraint({
        source: count_indicator,
        coordinate: Clutter.BindCoordinate.SIZE,
    }));
    dateMenuLayout.add_child(count_indicator);

}

function disable() {
    let dateMenuLayout = dateMenu.get_children()[0];

    // Remove
    dateMenuLayout.remove_child(count_indicator);
    count_indicator.destroy()

    // Add original indicator
    dateMenuLayout.add_child(orig_indicator);
    dateMenu._indicator = orig_indicator;

    // add the constraint back
    orig_pad.remove_constraint(orig_pad.get_constraints()[0])
    orig_pad.add_constraint(new Clutter.BindConstraint({
        source: orig_indicator,
        coordinate: Clutter.BindCoordinate.SIZE,
    }));
}

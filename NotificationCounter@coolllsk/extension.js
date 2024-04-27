import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

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

        this._sources = new Map();
        this._signals = [];

        this._connectSignal(Main.messageTray, 'source-added', this._onSourceAdded.bind(this));
        this._connectSignal(Main.messageTray, 'source-removed', this._onSourceRemoved.bind(this));
        this._connectSignal(Main.messageTray, 'queue-changed', this._updateCount.bind(this));

        let sources = Main.messageTray.getSources();
        sources.forEach((source) => this._onSourceAdded(null, source) );

        this.connect('destroy', this._onDestroy.bind(this));
    }

    _onSourceAdded(tray, source) {
        const sourceSignals = [
            source.connect('notify::count', this._updateCount.bind(this)),
            source.connect('notification-added', this._updateCount.bind(this)),
            source.connect('notification-removed', this._updateCount.bind(this))
        ];
        this._sources.set(source, sourceSignals);
        this._updateCount();
    }

    _onSourceRemoved(tray, source) {
        this._sources.get(source).forEach((sig) => source.disconnect(sig));
        this._sources.delete(source);
        this._updateCount();
    }

    _getSources() {
        return [...this._sources.keys()];
    }

    _updateCount() {
        let count = 0;
        let label;
        this._getSources().forEach((source) => {
                for (let i=0; i < source.notifications.length; i++) {
                    let notification = source.notifications[i];
                    if (notification.urgency >= MessageTray.Urgency.NORMAL) {
                        // increment counter
                        count++;
                    }
                }
            });

        if (count > 10) {
            // Limit count
            count = 10;
        }

        // Create unicode character based on count (➊ .. ➓)
        label = String.fromCharCode(0x2789 + count);
        this.text = label;
        this.visible = (count > 0);
    }

    _connectSignal(target, signal, callback) {
        let s = target.connect(signal, callback);
        this._signals.push([target, s]);
    }

    _onDestroy() {
        this._signals.forEach( (sig) => sig[0].disconnect(sig[1]) );
        this._sources.forEach( (sigs, source) => sigs.forEach((sig) => source.disconnect(sig) ));
    }

});


export default class MessageCounterIndicatorExtension {
enable() {
    this.dateMenu = Main.panel.statusArea.dateMenu;
    let dateMenuLayout = this.dateMenu.get_children()[0];
    let actors = dateMenuLayout.get_children();
    let orig_pad = actors[0];
    this.orig_indicator = this.dateMenu._indicator;

    // Remove original pad
    dateMenuLayout.remove_child(orig_pad);
    orig_pad.destroy();

    // Remove original indicator
    dateMenuLayout.remove_child(this.orig_indicator);

    // Create new indicator
    this.count_indicator = new MessageCounterIndicator();
    this.dateMenu._indicator = this.count_indicator;

    // Add it with pad and constraint
    // Have to create a new one, to unbind with original pad.
    let pad = new St.Widget();
    this.count_indicator.bind_property('visible', pad, 'visible', GObject.BindingFlags.SYNC_CREATE);
    pad.add_constraint(new Clutter.BindConstraint({
        source: this.count_indicator,
        coordinate: Clutter.BindCoordinate.SIZE,
    }));

    dateMenuLayout.add_child(this.count_indicator);
    dateMenuLayout.add_child(pad);
    dateMenuLayout.set_child_at_index(pad, 0);
}

disable() {
    let dateMenuLayout = this.dateMenu.get_children()[0];
    let old_pad = dateMenuLayout.get_children()[0];

    // Remove
    dateMenuLayout.remove_child(old_pad);
    dateMenuLayout.remove_child(this.count_indicator);
    old_pad.destroy();
    this.count_indicator.destroy();

    // Add original indicator
    dateMenuLayout.add_child(this.orig_indicator);
    this.dateMenu._indicator = this.orig_indicator;

    // add the pad and constraint back
    let pad = new St.Widget();
    this.dateMenu._indicator.bind_property('visible', pad, 'visible', GObject.BindingFlags.SYNC_CREATE);
    pad.add_constraint(new Clutter.BindConstraint({
        source: this.orig_indicator,
        coordinate: Clutter.BindCoordinate.SIZE,
    }));
    dateMenuLayout.add_child(pad);
    dateMenuLayout.set_child_at_index(pad, 0);
}
}

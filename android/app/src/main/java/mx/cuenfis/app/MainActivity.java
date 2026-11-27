package mx.cuenfis.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImpresoraPlugin.class); // antes de super.onCreate para que la web lo encuentre
        super.onCreate(savedInstanceState);
    }
}

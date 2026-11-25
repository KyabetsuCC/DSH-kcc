package io.github.jackwener.dsh.feature.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.jackwener.dsh.R
import io.github.jackwener.dsh.core.designsystem.Dsh
import io.github.jackwener.dsh.core.designsystem.DshType
import io.github.jackwener.dsh.core.designsystem.DTopBar
import io.github.jackwener.dsh.core.designsystem.Segmented
import io.github.jackwener.dsh.core.designsystem.SettingsCard

/**
 * ball-look: the floating ball and its bubble, sized and faded from one page. The service watches the
 * same settings, so every change shows up on the ball while this page is still open.
 */
@Composable
internal fun BallLookPage(vm: SettingsViewModel, onClose: () -> Unit) {
    val s by vm.settings.collectAsStateWithLifecycle()
    val c = Dsh.colors
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(Modifier.fillMaxSize().background(c.bgBase).statusBarsPadding().navigationBarsPadding()) {
            DTopBar(stringResource(R.string.ball_look_setting), onClose)
            Column(
                Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                SettingsCard {
                    LookRow(R.string.ball_size_setting, SIZES, s.ballSize) { vm.setBallLook(ballSize = it) }
                    LookRow(R.string.ball_alpha_setting, ALPHAS, s.ballAlpha) { vm.setBallLook(ballAlpha = it) }
                    LookRow(R.string.bubble_size_setting, SIZES, s.bubbleSize) { vm.setBallLook(bubbleSize = it) }
                    LookRow(R.string.bubble_alpha_setting, ALPHAS, s.bubbleAlpha) { vm.setBallLook(bubbleAlpha = it) }
                }
                Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) {
                    Box(
                        Modifier.size((48.dp) * (s.ballSize / 100f))
                            .alpha(s.ballAlpha / 100f)
                            .clip(CircleShape)
                            .background(c.business),
                    )
                }
                Text(
                    stringResource(R.string.ball_look_hint),
                    style = DshType.xs13, color = c.labelTertiary,
                )
            }
        }
    }
}

private val SIZES = listOf(80, 100, 120, 140)
private val ALPHAS = listOf(40, 60, 80, 100)

@Composable
private fun LookRow(title: Int, levels: List<Int>, current: Int, onPick: (Int) -> Unit) {
    val near = levels.indices.minByOrNull { kotlin.math.abs(levels[it] - current) } ?: 0
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(title), style = DshType.s14, color = Dsh.colors.labelPrimary)
        Segmented(levels.map { "$it%" }, near, { onPick(levels[it]) }, compact = true)
    }
}

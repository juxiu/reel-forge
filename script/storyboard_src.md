# Storyboard

| SC01 | {S01.from}–{S01.to} | hook | A request crosses multiple connections; integrity scope narrows from hop to end-to-end. | enter + camera push; continuous: connection nodes travel; hold: 36f |
| SC02 | {S02.from}–{S02.to} | mechanism | Content-Digest protects message content while Repr-Digest protects representation data. | split + transform + pan; continuous: digest signal travels between nodes; hold: 36f |
| SC03 | {S03.from}–{S03.to} | negotiation | Want-* fields express sender preferences. | cards enter in sequence + push; continuous: preference signal moves toward receiver; hold: 36f |
| SC04 | {S04.from}–{S04.to} | unification | Structured Fields give one encoding rule and the new fields replace the old pair. | transform + camera pan; continuous: old field morphs into new field; hold: 36f |

## 全局约束

- 事实清单：RFC 9530，Digest Fields，Content-Digest，Repr-Digest，Want-Content-Digest，Want-Repr-Digest，Structured Fields。
- 闪烁白名单：SC01 RFC 9530；其余镜头 0 次。
- 扫光白名单：SC01。
- 每镜头一个主角；主角 >=170px；字幕带与进度条不放主体。
- 每镜头有持续动作，末拍稳定 >=30 帧；不为凑指标添加无意义漂浮。

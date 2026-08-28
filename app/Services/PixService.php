<?php

namespace App\Services;

class PixService
{
    /**
     * Gera o payload "Pix Copia e Cola" (BR Code / EMV-QRCPS-MPM).
     * Validado contra CRC16-CCITT (polinômio 0x1021, init 0xFFFF).
     */
    public function payload(
        string $key,
        string $merchantName,
        string $merchantCity,
        string $txid,
        float $amount,
        ?string $description = null
    ): string {
        $mai = $this->tlv('00', 'br.gov.bcb.pix')
             . $this->tlv('01', $key);

        if ($description) {
            $mai .= $this->tlv('02', $this->sanitize($description, 40));
        }

        $payload = $this->tlv('00', '01')                               // Payload Format
                 . $this->tlv('01', '12')                               // dinâmico/uso único
                 . $this->tlv('26', $mai)                               // Merchant Account Info
                 . $this->tlv('52', '0000')                             // MCC
                 . $this->tlv('53', '986')                              // BRL
                 . $this->tlv('54', number_format($amount, 2, '.', ''))
                 . $this->tlv('58', 'BR')
                 . $this->tlv('59', $this->sanitize($merchantName, 25))
                 . $this->tlv('60', $this->sanitize($merchantCity, 15))
                 . $this->tlv('62', $this->tlv('05', $this->sanitize($txid, 25)));

        $partial = $payload . '6304';

        return $partial . $this->crc16($partial);
    }

    /** ID + tamanho (2 dígitos) + valor */
    private function tlv(string $id, string $value): string
    {
        return $id . str_pad((string) mb_strlen($value), 2, '0', STR_PAD_LEFT) . $value;
    }

    /** Pix não aceita acento nem caractere especial */
    private function sanitize(string $value, int $max): string
    {
        $clean = iconv('UTF-8', 'ASCII//TRANSLIT', $value);
        $clean = preg_replace('/[^A-Za-z0-9 .-]/', '', $clean);

        return mb_strtoupper(trim(mb_substr($clean, 0, $max)));
    }

    private function crc16(string $payload): string
    {
        $crc = 0xFFFF;

        foreach (str_split($payload) as $char) {
            $crc ^= ord($char) << 8;

            for ($i = 0; $i < 8; $i++) {
                $crc = ($crc & 0x8000)
                    ? (($crc << 1) ^ 0x1021) & 0xFFFF
                    : ($crc << 1) & 0xFFFF;
            }
        }

        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    public function txid(int $orderId): string
    {
        return 'CS' . str_pad((string) $orderId, 8, '0', STR_PAD_LEFT) . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
    }
}
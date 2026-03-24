package fingenie.com.fingenie.repository;

import fingenie.com.fingenie.entity.Account;
import fingenie.com.fingenie.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {
    List<Wallet> findByAccount(Account account);
    List<Wallet> findByAccountId(Long accountId);
    long countByAccountId(Long accountId);
    Optional<Wallet> findByAccountAndIsDefaultTrue(Account account);
    Optional<Wallet> findByAccountIdAndIsDefaultTrue(Long accountId);

    // For validation: check wallet name uniqueness within user's wallets
    boolean existsByAccountIdAndWalletNameIgnoreCase(Long accountId, String walletName);
    boolean existsByAccountIdAndWalletNameIgnoreCaseAndIdNot(Long accountId, String walletName, Long excludeWalletId);
}
